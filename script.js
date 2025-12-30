    const LOCAL_STORAGE_KEY_BASE = 'stimmungstagebuch_data_';
    const USER_VITAL_INFO_KEY_BASE = 'user_vital_info_'; 
    const ACTIVE_USER_KEY = 'active_stimmungs_user';
    const USER_LIST_KEY = 'stimmungs_user_list';
    
    let activeUser = 'Standard'; 
    
    let selectedPeriod = null;
    let selectedMood = null;
    let selectedPain = null; 
    let allStoredEntries = []; 
    let userVitalInfo = {}; 

	const darkModeToggle = document.getElementById('dark-mode-toggle');
	const darkModeIcon = document.getElementById('dark-mode-icon');
	const htmlElement = document.documentElement;

	// --- Bei den anderen DOM-Elementen oben einfügen ---
	const sleepStarsContainer = document.getElementById('sleep-stars');
	const sleepStars = document.querySelectorAll('#sleep-stars .star');
	const sleepInput = document.getElementById('sleep-quality');
	const sleepRatingText = document.getElementById('sleep-rating-text');
	const resetSleepBtn = document.getElementById('reset-sleep');
	

	sleepStars.forEach(star => {
   	 star.addEventListener('click', function() {
    	    const val = parseInt(this.getAttribute('data-value'));
      	  sleepInput.value = val;
      	  sleepRatingText.innerText = val + (val === 1 ? " Stern" : " Sterne");

        	sleepStars.forEach(s => {
        	    const sVal = parseInt(s.getAttribute('data-value'));
        	    s.classList.toggle('text-yellow-400', sVal <= val);
           	 s.classList.toggle('text-gray-300', sVal > val);
      	  });
  	  });
	});

	resetSleepBtn.addEventListener('click', () => {
   	 sleepInput.value = "0";
  	  sleepRatingText.innerText = "0 Sterne";
 	   sleepStars.forEach(s => {
        	s.classList.remove('text-yellow-400');
  	      s.classList.add('text-gray-300');
   	 });
	});


	if (localStorage.getItem('theme') === 'dark' || 
    	(!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
   	 htmlElement.classList.add('dark');
   	 if (darkModeIcon) darkModeIcon.textContent = '☀️';
	}

	darkModeToggle.addEventListener('click', () => {
   	 if (htmlElement.classList.contains('dark')) {
       	 htmlElement.classList.remove('dark');
      	  localStorage.setItem('theme', 'light');
      	  darkModeIcon.textContent = '🌙';
  	  } else {
      	  htmlElement.classList.add('dark');
    	    localStorage.setItem('theme', 'dark');
      	  darkModeIcon.textContent = '☀️';
  	  }
   	 if (typeof updateCharts === "function") updateCharts(); 
	});


    const WEATHER_API_BASE_URL = "https://api.open-meteo.com/v1/forecast";
    let currentTemperatureData = null; 
    let userLatitude = null; 
    let userLongitude = null; 
    let lastFetchedDate = null; 
    const PERIOD_TIME_MAP = { 'Nacht': 3, 'Morgen': 9, 'Mittag': 13, 'Abend': 19 };
    const AUTO_PERIOD_MAP = [ { name: 'Nacht', startHour: 0, endHour: 5 }, { name: 'Morgen', startHour: 5, endHour: 12 }, { name: 'Mittag', startHour: 12, endHour: 18 }, { name: 'Abend', startHour: 18, endHour: 24 } ];
    const WMO_CODE_MAP = { 0: 'Klarer Himmel ☀️', 1: 'Hauptsächlich klar 🌤️', 2: 'Teilweise bewölkt 🌥️', 3: 'Bedeckt ☁️', 45: 'Nebel 🌫️', 48: 'Reif-/Glätte-Nebel 🌫️', 51: 'Leichter Nieselregen 🌧️', 53: 'Mäßiger Nieselregen 🌧️', 55: 'Starker Nieselregen 🌧️', 56: 'Leichter gefrierender Nieselregen 🌨️', 57: 'Starker gefrierender Nieselregen 🌨️', 61: 'Leichter Regen 🌧️', 63: 'Mäßiger Regen 🌧️', 65: 'Starker Regen 🌧️', 66: 'Leichter gefrierender Regen ❄️', 67: 'Starker gefrierender Regen ❄️', 71: 'Leichter Schneefall 🌨️', 73: 'Mäßiger Schneefall 🌨️', 75: 'Starker Schneefall 🌨️', 77: 'Schneegriesel ❄️', 80: 'Leichte Regenschauer 🌦️', 81: 'Mäßige Regenschauer 🌦️', 82: 'Starke Regenschauer ⛈️', 85: 'Leichte Schneeschauer 🌨️', 86: 'Starke Schneeschauer 🌨️', 95: 'Gewitter (leicht/mäßig) 🌩️', 96: 'Gewitter mit leichtem Hagel ⛈️', 99: 'Gewitter mit starkem Hagel ⛈️' };
    const PAIN_REGION_NAMES = { 'oben': 'Oben', 'mitte': 'Mitte', 'unten': 'Unten' };
    const entryDateEl = document.getElementById('entry-date'); 
    const timePeriodsEl = document.getElementById('time-periods');
    const moodSelectionEl = document.getElementById('mood-selection');
    const painSelectionEl = document.getElementById('pain-selection'); 
    const painRegionsFieldset = document.getElementById('pain-regions'); 
    const pulsEl = document.getElementById('puls'); 
    const gewichtEl = document.getElementById('gewicht'); 
    const blutzuckerEl = document.getElementById('blutzucker'); 
    const blutdruckSysEl = document.getElementById('blutdruckSys'); 
    const blutdruckDiaEl = document.getElementById('blutdruckDia');
    const noteEl = document.getElementById('note');
    const saveButton = document.getElementById('save-entry');
    const statusMessageEl = document.getElementById('status-message');
    const historyContainerEl = document.getElementById('history-container');
    const loadingHistoryEl = document.getElementById('loading-history');
    const noEntriesEl = document.getElementById('no-entries');
    const resetButton = document.getElementById('reset-data'); 
    const resetStatusEl = document.getElementById('reset-status'); 
    const weatherStatusEl = document.getElementById('weather-status'); 
    const yearFilterEl = document.getElementById('year-filter'); 
    const monthFilterEl = document.getElementById('month-filter');
    const statsContainerEl = document.getElementById('stats-container');
    const jsonFileInput = document.getElementById('json-file-input');
    const importButton = document.getElementById('import-data');
    const importStatusEl = document.getElementById('import-status');
    const exportButton = document.getElementById('export-data');
    const exportChartButton = document.getElementById('export-chart-button');
    const exportPainChartButton = document.getElementById('export-pain-chart-button'); 
    const exportVitalChartButton = document.getElementById('export-vital-chart-button');
    const helpButton = document.getElementById('help-button');
    const helpModal = document.getElementById('help-modal');
    const closeModalButton = document.getElementById('close-modal');
    const geburtsdatumEl = document.getElementById('geburtsdatum');
    const koerpergroesseEl = document.getElementById('koerpergroesse');
    const bmiDisplayEl = document.getElementById('bmi-display');
    
    const manageUsersBtn = document.getElementById('manage-users-btn');
    const userModal = document.getElementById('user-modal');
    const closeUserModalBtn = document.getElementById('close-user-modal');
    const userListSelect = document.getElementById('user-list-select');
    const switchUserBtn = document.getElementById('switch-user-btn');
    const newUserNameInput = document.getElementById('new-user-name');
    const addUserBtn = document.getElementById('add-user-btn');
    const currentUserDisplay = document.getElementById('current-user-display');
    const userStatusMessage = document.getElementById('user-status-message');

    const userDeleteSelect = document.getElementById('user-delete-select');
    const deleteUserBtn = document.getElementById('delete-user-btn');

    entryDateEl.value = new Date().toISOString().split('T')[0]; 
    const MOOD_EMOJIS = { 'sehr_gut': '😀', 'gut': '🙂', 'neutral': '😐', 'schlecht': '🙁', 'sehr_schlecht': '😞' };
    window.MOOD_NAMES = { 'sehr_gut': 'Sehr gut', 'gut': 'Gut', 'neutral': 'Neutral', 'schlecht': 'Schlecht', 'sehr_schlecht': 'Sehr schlecht' };
    window.MOOD_VALUES = { 'sehr_schlecht': 1, 'schlecht': 2, 'neutral': 3, 'gut': 4, 'sehr_gut': 5 };
    const MONTH_NAMES = [ "Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember" ];

    function getLocalStorageKey() {
        return LOCAL_STORAGE_KEY_BASE + activeUser;
    }

    function getUserVitalInfoKey() {
        return USER_VITAL_INFO_KEY_BASE + activeUser;
    }


    function loadUserVitalInfo() {
        try {
            const data = localStorage.getItem(getUserVitalInfoKey());
            userVitalInfo = data ? JSON.parse(data) : {};
        } catch (e) {
            console.error("Fehler beim Laden der Benutzer-Vitaldaten:", e);
            userVitalInfo = {};
        }
    }
    
    function saveUserVitalInfo(geburtsdatum, koerpergroesse) {
        userVitalInfo.geburtsdatum = geburtsdatum;
        userVitalInfo.koerpergroesse = koerpergroesse;
        try {
            localStorage.setItem(getUserVitalInfoKey(), JSON.stringify(userVitalInfo));
        } catch (e) {
            console.error("Fehler beim Speichern der Benutzer-Vitaldaten:", e);
        }
    }

    function loadEntriesFromLocalStorage() {
        try {
            const data = localStorage.getItem(getLocalStorageKey());
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Fehler beim Laden aus localStorage:", e);
            return [];
        }
    }

    function saveEntriesToLocalStorage(entries) {
        try {
            localStorage.setItem(getLocalStorageKey(), JSON.stringify(entries));
            allStoredEntries = entries; 
        } catch (e) {
            console.error("Fehler beim Speichern in localStorage:", e);
        }
    }
    
    function getSavedUsers() {
        try {
            const users = localStorage.getItem(USER_LIST_KEY);
            return users ? JSON.parse(users).sort((a, b) => a.localeCompare(b)) : ['Standard']; 
        } catch (e) {
            console.error("Fehler beim Laden der Benutzerliste:", e);
            return ['Standard'];
        }
    }

    function saveUsers(users) {
        try {
            localStorage.setItem(USER_LIST_KEY, JSON.stringify(users));
        } catch (e) {
            console.error("Fehler beim Speichern der Benutzerliste:", e);
        }
    }
    
    function loadActiveUser() {
        const users = getSavedUsers();
        const savedUser = localStorage.getItem(ACTIVE_USER_KEY);
        
        if (savedUser && users.includes(savedUser)) {
            activeUser = savedUser;
        } else {
            activeUser = users[0] || 'Standard';
            if (!users.includes('Standard')) {
                users.push('Standard');
                saveUsers(users);
            }
            localStorage.setItem(ACTIVE_USER_KEY, activeUser);
        }
        currentUserDisplay.textContent = activeUser;
    }
    
    function switchToUser(username) {
        if (username === activeUser) return;
        localStorage.setItem(ACTIVE_USER_KEY, username);

        window.location.reload(); 
    }

    function populateUserDeleteList() {
        const users = getSavedUsers();
        userDeleteSelect.innerHTML = '<option value="" disabled selected>Wähle einen zu löschenden Benutzer</option>';
        let hasDeletableUser = false;
        
        users.forEach(user => {
            if (user !== activeUser) {
                const option = document.createElement('option');
                option.value = user;
                option.textContent = user;
                userDeleteSelect.appendChild(option);
                hasDeletableUser = true;
            }
        });
        
        if (!hasDeletableUser) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Keine anderen Benutzer verfügbar';
            userDeleteSelect.appendChild(option);
            userDeleteSelect.disabled = true;
            deleteUserBtn.disabled = true;
        } else {
            userDeleteSelect.disabled = false;
        }
    }

    function handleDeleteUser() {
        const userToDelete = userDeleteSelect.value;
        if (!userToDelete) return;
        
        if (!confirm(`SIND SIE SICHER? Alle Daten (Einträge und Vitaldaten) des Benutzers "${userToDelete}" werden unwiderruflich gelöscht!`)) {
            return;
        }

        localStorage.removeItem(LOCAL_STORAGE_KEY_BASE + userToDelete);
        localStorage.removeItem(USER_VITAL_INFO_KEY_BASE + userToDelete);
        

        let users = getSavedUsers();
        users = users.filter(u => u !== userToDelete);
        saveUsers(users);

        userStatusMessage.textContent = `Benutzer "${userToDelete}" und seine Daten wurden gelöscht.`;
        userStatusMessage.className = 'mt-2 text-sm text-center font-medium text-green-600 h-4';
        

        populateUserModal();
    }
    
    function populateUserModal() {
        const users = getSavedUsers();
        userListSelect.innerHTML = '';
        users.forEach(user => {
            const option = document.createElement('option');
            option.value = user;
            option.textContent = user + (user === activeUser ? ' (Aktiv)' : '');
            userListSelect.appendChild(option);
        });
        userListSelect.value = activeUser;
        switchUserBtn.disabled = true; 
        
        populateUserDeleteList();

        newUserNameInput.value = '';
        addUserBtn.disabled = true;
        userModal.classList.add('modal-show');
    }

    function handleSwitchUser() {
        const selectedUser = userListSelect.value;
        if (selectedUser && selectedUser !== activeUser) {
            switchToUser(selectedUser);
        }
    }

    function handleAddUser() {
        const newName = newUserNameInput.value.trim();
        if (!newName) {
            userStatusMessage.textContent = 'Bitte einen Namen eingeben.';
            userStatusMessage.className = 'mt-2 text-sm text-center font-medium text-red-600 h-4';
            return;
        }
        let users = getSavedUsers();
        if (users.map(u => u.toLowerCase()).includes(newName.toLowerCase())) {
            userStatusMessage.textContent = `Benutzer "${newName}" existiert bereits.`;
            userStatusMessage.className = 'mt-2 text-sm text-center font-medium text-red-600 h-4';
            return;
        }
        users.push(newName);
        saveUsers(users);
        populateUserModal(); 
        userStatusMessage.textContent = `Benutzer "${newName}" hinzugefügt. Jetzt wechseln!`;
        userStatusMessage.className = 'mt-2 text-sm font-medium text-green-600 h-4';
        userListSelect.value = newName; 
        switchUserBtn.disabled = false;
        addUserBtn.disabled = true;
    }

    function generatePainButtons() {
        let html = '';
        for (let i = 0; i <= 10; i++) {
            let title = '';
            if (i === 0) {
                title = 'Keine Schmerzen';
            } else if (i === 10) {
                title = 'Stärkste Schmerzen';
            } else {
                title = 'Schmerzstufe ' + i;
            }

            html += `
                <button class="pain-button text-sm w-8 h-8 rounded-full border border-gray-300 transition duration-100 hover:bg-red-100" data-pain="${i}" title="${title}">
                    ${i}
                </button>
            `;
        }
        painSelectionEl.innerHTML = html;
    }


    function calculateBMI(weightKg, heightCm) {
        if (weightKg > 0 && heightCm > 0) {
            const heightM = heightCm / 100;

            const bmi = weightKg / (heightM * heightM); 
            return bmi.toFixed(1);
        }
        return 'N/A';
    }

    function calculateAndDisplayBMI() {
        const weight = getNumericValue(gewichtEl);
        const height = getNumericValue(koerpergroesseEl);
        const bmi = calculateBMI(weight, height);
        
        bmiDisplayEl.value = bmi;
        

        bmiDisplayEl.className = `w-full p-2 border border-gray-300 rounded-lg text-center font-bold 
            ${bmi === 'N/A' ? 'bg-gray-100' : 
            bmi < 18.5 ? 'bg-blue-200 text-blue-800' : 
            bmi < 25 ? 'bg-green-200 text-green-800' : 
            bmi < 30 ? 'bg-yellow-200 text-yellow-800' : 
            'bg-red-200 text-red-800'}`;
    }

    function preselectTimePeriod() {
        document.querySelectorAll('.period-button').forEach(b => b.classList.remove('selected-period'));
        selectedPeriod = null; 
        const currentHour = new Date().getHours();
        let periodToSelect = null;
        for (const period of AUTO_PERIOD_MAP) {
            if (currentHour >= period.startHour && currentHour < period.endHour) {
                periodToSelect = period.name;
                break;
            }
        }
        if (periodToSelect) {
            const btn = document.querySelector(`.period-button[data-period="${periodToSelect}"]`);
            if (btn) {
                selectedPeriod = periodToSelect;
                btn.classList.add('selected-period');
            }
        }
    }
    
    function resetInputFields() {
        document.querySelectorAll('.period-button').forEach(b => b.classList.remove('selected-period'));
        document.querySelectorAll('.mood-icon').forEach(i => i.classList.remove('selected-mood'));
        document.querySelectorAll('.pain-button').forEach(b => b.classList.remove('selected-pain'));
        
        selectedPeriod = null;
        selectedMood = null;
        selectedPain = null; 
        
        entryDateEl.value = new Date().toISOString().split('T')[0]; 
        
        painRegionsFieldset.querySelectorAll('input[type="checkbox"]').forEach(c => c.checked = false);
        pulsEl.value = '';
        gewichtEl.value = '';

        blutzuckerEl.value = '';
        blutdruckSysEl.value = '';
        blutdruckDiaEl.value = '';
        noteEl.value = '';

        calculateAndDisplayBMI();
        preselectTimePeriod(); 
        checkFormValidity();
        updateWeatherDisplayForSelectedPeriod();
        fetchWeather(entryDateEl.value); 
    }

    function setupApp() {
        loadActiveUser();
        allStoredEntries = loadEntriesFromLocalStorage(); 
        loadUserVitalInfo(); 
        
        geburtsdatumEl.value = userVitalInfo.geburtsdatum || '';
        koerpergroesseEl.value = userVitalInfo.koerpergroesse || '';
        
        generatePainButtons(); 
        preselectTimePeriod(); 
        calculateAndDisplayBMI(); 
        renderSortedHistory(allStoredEntries, true); 
        fetchWeather(entryDateEl.value); 
    }
    function updateWeatherDisplayForSelectedPeriod() {
        if (userLatitude === null || userLongitude === null) {
            if (weatherStatusEl.textContent.includes('Timeout') || weatherStatusEl.textContent.includes('verweigert')) {
                return; 
            }
            if (!weatherStatusEl.textContent.includes('Lade Standort')) {
                 weatherStatusEl.textContent = 'Standort nicht verfügbar. Eintrag ohne Wetter.';
            }
            return;
        }

        if (!selectedPeriod) {
            weatherStatusEl.textContent = 'Wählen Sie einen Zeitraum für die Wetterinformation.';
            return;
        }
        const weather = getWeatherDataForPeriod(selectedPeriod, entryDateEl.value);
        if (weather.temperature !== null) {
            weatherStatusEl.textContent = `✅ Wetter für ${selectedPeriod}: ${weather.temperature}°C, ${weather.weatherCondition}`;
        } else if (currentTemperatureData === null || currentTemperatureData.length === 0) {
            weatherStatusEl.textContent = 'Lade Wetterdaten...'; 
        } else {
            weatherStatusEl.textContent = '⚠️ Keine präzisen Wetterdaten für diese Zeit gefunden.';
        }
    }
    
    let retryCount = 0; 
    const MAX_RETRIES = 2; 

    async function fetchWeather(targetDateStr) {
        if (!targetDateStr) return; 
        
        if (userLatitude !== null && userLongitude !== null && lastFetchedDate && currentTemperatureData && currentTemperatureData.length > 0) {
            const targetTime = new Date(targetDateStr).getTime();
            const loadedStartTime = new Date(lastFetchedDate).getTime();
            const fourteenDaysInMs = 14 * 24 * 60 * 60 * 1000;
            const loadedEndTime = loadedStartTime + fourteenDaysInMs;
            
            if (targetTime >= loadedStartTime && targetTime < loadedEndTime) {
                updateWeatherDisplayForSelectedPeriod();
                checkFormValidity(); 
                retryCount = 0;
                return;
            }
        }
        
        if (userLatitude === null || retryCount > 0) { 
            if (!navigator.geolocation) {
                weatherStatusEl.textContent = 'Geolocation wird nicht unterstützt. Wetterdaten nicht verfügbar.';
                checkFormValidity(); 
                userLatitude = null; userLongitude = null; 
                updateWeatherDisplayForSelectedPeriod();
                return;
            }

            if (retryCount === 0) {
                weatherStatusEl.textContent = 'Lade Standort... (Bitte erlauben Sie den Zugriff)';
            } else {
                weatherStatusEl.textContent = `Standort-Timeout! Starte Versuch ${retryCount + 1}/${MAX_RETRIES + 1} ...`;
            }

            try {
                const position = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { 
                        timeout: 5000,
                        enableHighAccuracy: false 
                    });
                });
                userLatitude = position.coords.latitude; 
                userLongitude = position.coords.longitude; 
                retryCount = 0;
            } catch (error) {
                console.error("Fehler beim Abrufen des Standorts:", error);
                
                if (error.code === error.TIMEOUT && retryCount < MAX_RETRIES) {
                    retryCount++; 
                    console.warn(`Geolocation Timeout (Versuch ${retryCount}/${MAX_RETRIES}). Starte sofort erneute Abfrage...`);
                    return fetchWeather(targetDateStr); 
                }

                if (error.code === error.PERMISSION_DENIED) {
                     weatherStatusEl.textContent = '❌ Standortzugriff verweigert. Eintrag ohne Wetter.';
                } else if (error.code === error.TIMEOUT) {
                     weatherStatusEl.textContent = `❌ Standortabfrage-Timeout nach ${MAX_RETRIES + 1} Versuchen. Eintrag ohne Wetter.`;
                } else {
                     weatherStatusEl.textContent = '❌ Fehler beim Laden des Standorts. Eintrag ohne Wetter.';
                }

                userLatitude = null; 
                userLongitude = null; 
                currentTemperatureData = null; 
                retryCount = 0;
                updateWeatherDisplayForSelectedPeriod(); 
                checkFormValidity(); 
                return; 
            }
        } 
        
        weatherStatusEl.textContent = `Wetterdaten für ${window.formatDateShort(targetDateStr)} abrufen...`;
        await fetchWeatherData(userLatitude, userLongitude, targetDateStr);
        updateWeatherDisplayForSelectedPeriod(); 
        checkFormValidity(); 
    }


    async function fetchWeatherData(lat, lon, startDateStr) {
        const startDate = new Date(startDateStr);
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 14); 
        const startDateFormatted = startDateStr;
        const endDateFormatted = endDate.toISOString().split('T')[0];
        const url = `${WEATHER_API_BASE_URL}?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weathercode&timezone=auto&start_date=${startDateFormatted}&end_date=${endDateFormatted}`; 
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`API Fehler: ${response.status}`);
            const data = await response.json();
            const hourlyData = data.hourly.time.map((timestamp, index) => ({
                timestamp: new Date(timestamp).getTime(), 
                temp: data.hourly.temperature_2m[index],
                wmoCode: data.hourly.weathercode[index] 
            }));
            currentTemperatureData = hourlyData; 
            lastFetchedDate = startDateStr; 
            
            updateWeatherDisplayForSelectedPeriod(); 
            checkFormValidity(); 
        } catch (error) {
            console.error("Fehler beim Abrufen der Wetterdaten:", error);
            weatherStatusEl.textContent = '❌ Fehler beim Laden der Wetterdaten. Eintrag ohne Temperatur/Wetterzustand.';
            currentTemperatureData = null; 
            checkFormValidity(); 
            updateWeatherDisplayForSelectedPeriod();
        }
    }

    function getWeatherDataForPeriod(period, selectedDateStr) { 
        if (!selectedDateStr || !currentTemperatureData || currentTemperatureData.length === 0 || !period) {
             return { temperature: null, weatherCondition: null }; 
        }
        const targetHour = PERIOD_TIME_MAP[period];
        if (!targetHour) return { temperature: null, weatherCondition: null };
        const [year, month, day] = selectedDateStr.split('-').map(Number);
        let targetTime = new Date(year, month - 1, day, targetHour, 0, 0); 
        const targetTimestampMs = targetTime.getTime(); 
        let closestEntry = null;
        let minDiff = Infinity;
        currentTemperatureData.forEach(entry => {
            const diff = Math.abs(entry.timestamp - targetTimestampMs); 
            if (diff < minDiff && diff < (12 * 60 * 60 * 1000)) { 
                minDiff = diff;
                closestEntry = entry;
            }
        });
        if (closestEntry) {
            const temp = parseFloat(closestEntry.temp.toFixed(1));
            const condition = WMO_CODE_MAP[closestEntry.wmoCode] || 'Unbekannt'; 
            return { temperature: temp, weatherCondition: condition };
        } else {
            console.warn(`Keine Wetterdaten für ${selectedDateStr} - ${period} in den geladenen Daten gefunden.`);
            return { temperature: null, weatherCondition: null };
        }
    }

    function checkFormValidity() {
        const selectedDate = entryDateEl.value; 
        saveButton.disabled = !(selectedDate && selectedPeriod && selectedMood && selectedPain !== null); 
        saveButton.textContent = saveButton.disabled ? 'Bitte Datum, Zeitraum, Stimmung und Schmerz wählen' : 'Eintrag speichern';
    }

    function showHelpModal() { helpModal.classList.add('modal-show'); }
    function closeHelpModal() { helpModal.classList.remove('modal-show'); }
    
    function exportChart(chartId) {
        const chartCanvas = document.getElementById(chartId);
        if (!chartCanvas) { alert("Das Diagramm existiert nicht."); return; }
        const chartInstance = Chart.getChart(chartCanvas);
        if (!chartInstance) { alert("Das Diagramm kann nicht exportiert werden, da es keine Daten enthält."); return; }
        const imageURL = chartCanvas.toDataURL('image/png');
        const action = prompt("Möchten Sie das Diagramm speichern (S) oder drucken (D)?", "S");
        const filenamePrefix = chartId.includes('moodChart') ? 'stimmungs_chart' : (chartId.includes('vitalChart') ? 'vital_chart' : 'schmerzregionen_chart');

        if (action && action.toUpperCase() === 'S') {
            const a = document.createElement('a');
            a.href = imageURL;
            a.download = `${filenamePrefix}_${activeUser}_${new Date().toISOString().split('T')[0]}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } else if (action && action.toUpperCase() === 'D') {
            const printWindow = window.open('');
            printWindow.document.write('<img src="' + imageURL + '" style="max-width: 100%;">');
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
        }
    }
    
    function toggleScrollButton() {
        const button = document.getElementById('scrollToTopBtn');
        if (window.scrollY > 200) { 
            button.style.display = 'flex';
        } else {
            button.style.display = 'none';
        }
    }

    function setupFormListeners() {
        geburtsdatumEl.addEventListener('input', calculateAndDisplayBMI);
        koerpergroesseEl.addEventListener('input', calculateAndDisplayBMI);
        gewichtEl.addEventListener('input', calculateAndDisplayBMI);
        
        entryDateEl.addEventListener('change', () => {
            checkFormValidity();
            fetchWeather(entryDateEl.value); 
            updateWeatherDisplayForSelectedPeriod();
        });

        timePeriodsEl.addEventListener('click', (e) => {
            const btn = e.target.closest('.period-button');
            if (btn) {
                document.querySelectorAll('.period-button').forEach(b => b.classList.remove('selected-period'));
                selectedPeriod = btn.dataset.period;
                btn.classList.add('selected-period');
                checkFormValidity();
                
                updateWeatherDisplayForSelectedPeriod(); 

                if (entryDateEl.value) { 
                    fetchWeather(entryDateEl.value); 
                }
            }
        });

        moodSelectionEl.addEventListener('click', (e) => {
            const icon = e.target.closest('.mood-icon');
            if (icon) {
                document.querySelectorAll('.mood-icon').forEach(i => i.classList.remove('selected-mood'));
                selectedMood = icon.dataset.mood;
                icon.classList.add('selected-mood');
                checkFormValidity();
            }
        });

        painSelectionEl.addEventListener('click', (e) => {
            const btn = e.target.closest('.pain-button');
            if (btn) {
                document.querySelectorAll('.pain-button').forEach(b => b.classList.remove('selected-pain'));
                selectedPain = parseInt(btn.dataset.pain, 10); 
                btn.classList.add('selected-pain');
                checkFormValidity();
            }
        });
        
        saveButton.addEventListener('click', saveEntry);
        resetButton.addEventListener('click', resetData); 
        exportButton.addEventListener('click', exportData); 
        exportChartButton.addEventListener('click', () => exportChart('moodChart')); 
        exportPainChartButton.addEventListener('click', () => exportChart('painRegionChart')); 
        exportVitalChartButton.addEventListener('click', () => exportChart('vitalChart'));
        
        jsonFileInput.addEventListener('change', () => { importButton.disabled = !jsonFileInput.files.length; });
        importButton.addEventListener('click', importData);
        
        yearFilterEl.addEventListener('change', () => {
            populateMonthFilter(yearFilterEl.value);
            filterHistoryByYearMonth(yearFilterEl.value, monthFilterEl.value);
        });
        
        monthFilterEl.addEventListener('change', () => {
            filterHistoryByYearMonth(yearFilterEl.value, monthFilterEl.value);
        });

        helpButton.addEventListener('click', showHelpModal);
        closeModalButton.addEventListener('click', closeHelpModal);
        helpModal.addEventListener('click', (e) => {
            if (e.target === helpModal) { closeHelpModal(); }
        });
        
        document.getElementById('scrollToTopBtn').addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' }); 
        });
        
        window.addEventListener('scroll', toggleScrollButton);
        toggleScrollButton(); 
        
        
        manageUsersBtn.addEventListener('click', populateUserModal);
        closeUserModalBtn.addEventListener('click', () => { userModal.classList.remove('modal-show'); });
        userModal.addEventListener('click', (e) => {
            if (e.target === userModal) { userModal.classList.remove('modal-show'); }
        });
        userListSelect.addEventListener('change', () => { switchUserBtn.disabled = userListSelect.value === activeUser; });
        newUserNameInput.addEventListener('input', () => { 
            const name = newUserNameInput.value.trim();
            const users = getSavedUsers().map(u => u.toLowerCase());
            addUserBtn.disabled = name === '' || users.includes(name.toLowerCase()); 
        });
        switchUserBtn.addEventListener('click', handleSwitchUser);
        addUserBtn.addEventListener('click', handleAddUser);
        
        
        userDeleteSelect.addEventListener('change', () => { deleteUserBtn.disabled = userDeleteSelect.value === ''; });
        deleteUserBtn.addEventListener('click', handleDeleteUser);


        checkFormValidity();
    }
    
    function calculateAge(birthdateString) {
        if (!birthdateString) return null;
        const today = new Date();
        const birthDate = new Date(birthdateString);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    function getSelectedPainRegions() {
        const selectedRegions = [];
        painRegionsFieldset.querySelectorAll('input[type="checkbox"]:checked').forEach(checkbox => {
            selectedRegions.push(checkbox.value);
        });
        return selectedRegions;
    }

    function getNumericValue(element) {
        const value = element.value.trim();
        return value === '' ? null : parseFloat(value);
    }

	function saveEntry() {
 	   const entryDate = entryDateEl.value; 
 	   if (!entryDate || !selectedPeriod || !selectedMood || selectedPain === null) {
 	       statusMessageEl.textContent = "Bitte alle notwendigen Felder ausfüllen.";
 	       statusMessageEl.className = 'mt-3 text-center text-sm font-medium text-red-600 h-4';
        return;
	    }

	    saveButton.disabled = true;
	    statusMessageEl.textContent = 'Speichere...';

	    const docId = `${entryDate}_${selectedPeriod}`; 
	    const weather = getWeatherDataForPeriod(selectedPeriod, entryDate); 
	    const painRegions = getSelectedPainRegions(); 
    
  	  const geburtsdatum = geburtsdatumEl.value.trim() || null;
   	 const koerpergroesse = getNumericValue(koerpergroesseEl);
    
   	 saveUserVitalInfo(geburtsdatum, koerpergroesse); 

   	 const gewicht = getNumericValue(gewichtEl);
   	 const bmi = calculateBMI(gewicht, koerpergroesse);
   	 const alter = calculateAge(geburtsdatum);

   	 const newEntry = {
   	     id: docId, 
   	     date: entryDate, 
   	     timePeriod: selectedPeriod,
   	     mood: selectedMood,
   	     pain: selectedPain, 
   	     schmerzRegionen: painRegions, 
   	     geburtsdatum: geburtsdatum, 
   	     koerpergroesse: koerpergroesse, 
   	     alter: alter, 
   	     gewicht: gewicht,
   	     bmi: bmi,
   	     puls: getNumericValue(pulsEl), 
   	     blutzucker: getNumericValue(blutzuckerEl),
   	     blutdruckSys: getNumericValue(blutdruckSysEl),
   	     blutdruckDia: getNumericValue(blutdruckDiaEl),
   	     note: noteEl.value.trim(),
   	     temperature: weather.temperature, 
   	     weatherCondition: weather.weatherCondition, 
   	     timestamp: new Date().getTime(),
   	     sleepQuality: parseInt(sleepInput.value) || 0
   	 };

   	 const existingIndex = allStoredEntries.findIndex(e => e.id === docId);
   	 if (existingIndex > -1) {
   	     allStoredEntries[existingIndex] = newEntry; 
   	 } else {
   	     allStoredEntries.push(newEntry); 
   	 }

   	 try {
        saveEntriesToLocalStorage(allStoredEntries);
   	     statusMessageEl.textContent = 'Eintrag erfolgreich gespeichert!';
   	     statusMessageEl.className = 'mt-3 text-center text-sm font-medium text-green-600 h-4';
        
   	     setTimeout(() => {
   	         window.location.reload(); 
   	     }, 1500);
   	 } catch (error) {
   	     console.error("Fehler beim Speichern:", error);
   	     statusMessageEl.textContent = 'Fehler beim Speichern.';
   	     statusMessageEl.className = 'mt-3 text-center text-sm font-medium text-red-600 h-4';
   	 } finally {
   	     saveButton.disabled = false;
   	 }
	}

    function loadHistoryAndStartListening() {
        renderSortedHistory(allStoredEntries, true);
    }
    
    function populateYearFilter(entries) {
        const uniqueYears = Array.from(new Set(entries.map(entry => entry.date.substring(0, 4))));
        uniqueYears.sort().reverse();
        const currentValue = yearFilterEl.value;
        yearFilterEl.innerHTML = '<option value="all">Alle Jahre</option>';
        uniqueYears.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year; 
            yearFilterEl.appendChild(option);
        });
        if (uniqueYears.includes(currentValue) || currentValue === 'all') {
             yearFilterEl.value = currentValue;
        }
        populateMonthFilter(yearFilterEl.value);
    }
    
    function populateMonthFilter(selectedYear) {
        monthFilterEl.innerHTML = '<option value="all">Alle Monate</option>';
        if (selectedYear === 'all') {
            monthFilterEl.disabled = true;
            return;
        }
        monthFilterEl.disabled = false;
        const uniqueMonths = Array.from(new Set(
            allStoredEntries
                .filter(entry => entry.date.startsWith(selectedYear))
                .map(entry => entry.date.substring(5, 7))
        ));
        uniqueMonths.sort((a, b) => parseInt(b, 10) - parseInt(a, 10));

        uniqueMonths.forEach(monthStr => {
            const monthIndex = parseInt(monthStr, 10) - 1; 
            const monthName = MONTH_NAMES[monthIndex];
            const option = document.createElement('option');
            option.value = monthStr;
            option.textContent = monthName + ' (' + monthStr + ')'; 
            monthFilterEl.appendChild(option);
        });
        if (!uniqueMonths.includes(monthFilterEl.value)) {
            monthFilterEl.value = 'all';
        }
    }

    function filterHistoryByYearMonth(selectedYear, selectedMonth) {
        let filteredEntries = allStoredEntries;
        if (selectedYear !== 'all') {
            filteredEntries = filteredEntries.filter(entry => 
                entry.date.startsWith(selectedYear)
            );
        }
        if (selectedMonth !== 'all') {
            filteredEntries = filteredEntries.filter(entry => 
                entry.date.substring(5, 7) === selectedMonth
            );
        }
    	renderStats(filteredEntries);
    	renderHistory(filteredEntries);

    // NEU: Hier werden die Diagramme mit den gefilterten Daten aktualisiert
    	if (typeof renderMoodChart === 'function') renderMoodChart(filteredEntries);
    	if (typeof renderPainRegionChart === 'function') renderPainRegionChart(filteredEntries);
    	if (typeof renderVitalChart === 'function') renderVitalChart(filteredEntries);
	}
    
    function renderStats(entries) {
        statsContainerEl.innerHTML = '';
        if (entries.length === 0) {
            statsContainerEl.classList.add('hidden');
            return;
        }
        statsContainerEl.classList.remove('hidden');

        let moodSum = 0;
        let painSum = 0;
        let tempSum = 0;
        let tempCount = 0;
        let pulsSum = 0;
        let pulsCount = 0;
        let gewichtSum = 0;
        let gewichtCount = 0;
        let blutzuckerSum = 0;
        let blutzuckerCount = 0;
        let bmiSum = 0;
        let bmiCount = 0;


        entries.forEach(entry => {
            moodSum += window.MOOD_VALUES[entry.mood] || 3;
            painSum += entry.pain !== undefined && entry.pain !== null ? entry.pain : 0;
            if (entry.temperature !== undefined && entry.temperature !== null) {
                tempSum += entry.temperature;
                tempCount++;
            }
            if (entry.puls !== undefined && entry.puls !== null) {
                pulsSum += entry.puls;
                pulsCount++;
            }
            if (entry.gewicht !== undefined && entry.gewicht !== null) {
                gewichtSum += entry.gewicht;
                gewichtCount++;
            }
            if (entry.blutzucker !== undefined && entry.blutzucker !== null) {
                blutzuckerSum += entry.blutzucker;
                blutzuckerCount++;
            }
             if (entry.bmi !== undefined && entry.bmi !== null && entry.bmi !== 'N/A' && !isNaN(parseFloat(entry.bmi))) {
                bmiSum += parseFloat(entry.bmi);
                bmiCount++;
            }
        });

        const avgMood = (moodSum / entries.length).toFixed(2);
        const avgPain = (painSum / entries.length).toFixed(1);
        const avgTemp = tempCount > 0 ? (tempSum / tempCount).toFixed(1) : 'N/A';
        const avgPuls = pulsCount > 0 ? (pulsSum / pulsCount).toFixed(0) : 'N/A';
        const avgGewicht = gewichtCount > 0 ? (gewichtSum / gewichtCount).toFixed(1) : 'N/A';
        const avgBlutzucker = blutzuckerCount > 0 ? (blutzuckerSum / blutzuckerCount).toFixed(0) : 'N/A';
        const avgBMI = bmiCount > 0 ? (bmiSum / bmiCount).toFixed(1) : 'N/A';


        function createStatCard(title, value, unit, color) {
            const card = document.createElement('div');
            card.className = 'stat-card';
            card.innerHTML = `
                <p class="stat-card-title">${title}</p>
                <p class="stat-card-value" style="color: ${color};">${value}${unit}</p>
            `;
            return card;
        }
        
        const MOOD_COLOR = '#4f46e5';   
        const PAIN_COLOR = '#9333ea';   
        const TEMP_COLOR = '#ef4444';   
        const PULS_COLOR = '#10b981';   
        const GEWICHT_COLOR = '#db2777'; 
        const BLUTZUCKER_COLOR = '#d97706'; 
        const BMI_COLOR = '#4c51bf'; 


        const moodCard = createStatCard( 'Ø Stimmung (1-5)', avgMood, '', MOOD_COLOR );
        const painCard = createStatCard( 'Ø Schmerz (0-10)', avgPain, '', PAIN_COLOR );
        const tempCard = createStatCard( 'Ø Temp', avgTemp, avgTemp !== 'N/A' ? '°C' : '', TEMP_COLOR );
        const pulsCard = createStatCard( 'Ø Puls', avgPuls, avgPuls !== 'N/A' ? ' BPM' : '', PULS_COLOR );
        const gewichtCard = createStatCard( 'Ø Gewicht', avgGewicht, avgGewicht !== 'N/A' ? ' kg' : '', GEWICHT_COLOR );
        const blutzuckerCard = createStatCard( 'Ø BZ', avgBlutzucker, avgBlutzucker !== 'N/A' ? ' mg/dL' : '', BLUTZUCKER_COLOR );
        const bmiCard = createStatCard( 'Ø BMI', avgBMI, '', BMI_COLOR );

        statsContainerEl.innerHTML = ''; 
        statsContainerEl.className = 'grid grid-cols-2 sm:grid-cols-3 gap-2 mb-6'; 
        statsContainerEl.appendChild(moodCard);
        statsContainerEl.appendChild(painCard);
        statsContainerEl.appendChild(tempCard);
        statsContainerEl.appendChild(pulsCard);
        statsContainerEl.appendChild(gewichtCard);
        statsContainerEl.appendChild(blutzuckerCard);
        statsContainerEl.appendChild(bmiCard); 
    }

    function renderSortedHistory(entries, updateChartFilter = true) {
        const sortedEntries = entries.sort((a, b) => {
            if (a.date < b.date) return 1;
            if (a.date > b.date) return -1;
            const order = ['Nacht', 'Morgen', 'Mittag', 'Abend']; 
            return order.indexOf(a.timePeriod) - order.indexOf(b.timePeriod);
        });

        if (updateChartFilter) {
            populateYearFilter(allStoredEntries);
            if (typeof renderMoodChart !== 'undefined') { renderMoodChart(allStoredEntries); }
            if (typeof renderPainRegionChart !== 'undefined') { renderPainRegionChart(allStoredEntries); }
            if (typeof renderVitalChart !== 'undefined') { renderVitalChart(allStoredEntries); }
            filterHistoryByYearMonth(yearFilterEl.value, monthFilterEl.value); 
            return; 
        }
        renderHistory(sortedEntries);
    }
    
    function renderHistory(entries) {
        loadingHistoryEl.classList.add('hidden');
        historyContainerEl.innerHTML = '';

        if (entries.length === 0) {
            noEntriesEl.classList.remove('hidden');
            return;
        }
        noEntriesEl.classList.add('hidden');

        const groupedByDate = entries.reduce((acc, entry) => {
            const dateKey = entry.date;
            if (!acc[dateKey]) { acc[dateKey] = []; }
            entry.timestamp = entry.timestamp || new Date(entry.date).getTime(); 
            acc[dateKey].push(entry);
            return acc;
        }, {});

        const sortedDates = Object.keys(groupedByDate).sort().reverse();

        sortedDates.forEach(date => {
            const dateGroup = document.createElement('div');
            dateGroup.className = 'mb-6 border border-gray-200 rounded-lg shadow-md overflow-hidden';

            const dateTitle = document.createElement('h3');
            dateTitle.className = 'bg-indigo-100 text-indigo-800 font-bold p-3 text-lg border-b border-indigo-200';
            dateTitle.textContent = formatDate(date);
            dateGroup.appendChild(dateTitle);

            const entriesList = document.createElement('div');
            groupedByDate[date].forEach(entry => { 
                entriesList.innerHTML += createEntryHtml(entry);
            });
            dateGroup.appendChild(entriesList);
            historyContainerEl.appendChild(dateGroup);
        });
        
        document.querySelectorAll('.delete-entry-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const entryId = e.currentTarget.dataset.id;
                deleteEntry(entryId);
            });
        });
    }

	function createEntryHtml(entry) {
    // Generierung der Sterne für die Liste
   	 const sleepStarsHtml = entry.sleepQuality > 0 
    	    ? `<span class="text-yellow-500 ml-2">${"★".repeat(entry.sleepQuality)}</span>` 
    	    : '<span class="text-gray-400 ml-2 text-xs">Kein Schlaf erfasst</span>';
        
    	const moodEmoji = MOOD_EMOJIS[entry.mood] || '❓';
    	const moodName = window.MOOD_NAMES[entry.mood] || 'Unbekannt';
    
    // Schmerzanzeige
    	const painDisplay = entry.pain !== undefined && entry.pain !== null 
    	                     ? `<span class="text-purple-600 font-bold ml-2">Schmerz: ${entry.pain}/10</span>`
    	                     : '';
                         
    	const painRegions = entry.schmerzRegionen && entry.schmerzRegionen.length > 0
    	                     ? `<span class="text-xs font-medium text-purple-500 ml-3 bg-purple-100 px-2 py-0.5 rounded-full">${entry.schmerzRegionen.map(r => PAIN_REGION_NAMES[r] || r).join(', ')}</span>`
    	                     : '';
    
    // Vitaldaten sammeln
    	let vitalData = [];
    	if (entry.puls !== undefined && entry.puls !== null) vitalData.push(`Puls: ${entry.puls} BPM`);
    	if (entry.gewicht !== undefined && entry.gewicht !== null) vitalData.push(`Gewicht: ${entry.gewicht} kg`);
    	if (entry.bmi !== undefined && entry.bmi !== null && entry.bmi !== 'N/A') vitalData.push(`BMI: ${entry.bmi}`); 
    	if (entry.blutzucker !== undefined && entry.blutzucker !== null) vitalData.push(`BZ: ${entry.blutzucker} mg/dL`);
    	if (entry.blutdruckSys !== undefined && entry.blutdruckSys !== null && entry.blutdruckDia !== undefined && entry.blutdruckDia !== null) {
    	     vitalData.push(`RR: ${entry.blutdruckSys}/${entry.blutdruckDia} mmHg`);
    	}
    
    	const alterDisplay = entry.alter !== undefined && entry.alter !== null
    	                    ? `<span class="text-xs font-medium text-gray-500 ml-3">Alter: ${entry.alter}</span>`
    	                    : '';
    
    	const vitalLine = vitalData.length > 0 
    	                    ? `<p class="text-xs text-yellow-700 font-medium mt-1 flex items-center">${vitalData.join(' · ')}${alterDisplay}</p>` 
    	                    : '';

    // Wetterdaten
    	let weatherLine = '';
    	if (entry.temperature !== undefined && entry.temperature !== null) { weatherLine += `${entry.temperature}°C`; }
    	if (entry.weatherCondition) {
    	     if (weatherLine) weatherLine += ' · ';
    	     weatherLine += entry.weatherCondition;
    	}

    // Das fertige HTML-Template zurückgeben
    	return `
    	    <div class="flex py-3 px-4 bg-white border-b border-gray-100 last:border-b-0 history-entry-item">
    	        <div class="flex items-start space-x-3 w-full">
    	            <span class="flex-shrink-0 text-xl font-bold text-indigo-500 w-16">${entry.timePeriod}</span>
    	            <div class="flex-shrink-0 text-3xl">${moodEmoji}</div>
    	            <div class="text-sm flex-grow min-w-0">
    	                <p class="font-semibold text-gray-700 flex items-center flex-wrap">
    	                    ${moodName}${painDisplay}${painRegions}
    	                </p>
    	                <p class="text-xs font-bold text-gray-600 flex items-center mt-0.5">
    	                    Schlaf: ${sleepStarsHtml}
    	                </p>
    	                ${vitalLine}
    	                ${(entry.note || weatherLine) ? 
    	                    `<p class="text-gray-500 italic text-xs mt-1 break-words">${entry.note ? entry.note + (weatherLine ? ' | ' : '') : ''}${weatherLine}</p>` 
    	                : ''}
    	            </div>
    	        </div>
    	        <button class="delete-entry-btn hover:text-red-600 text-2xl px-2" data-id="${entry.id}" title="Eintrag löschen">
    	            &times;
    	        </button>
    	    </div>
    	`;
	}


    function deleteEntry(id) {
        if (!confirm(`Sicher, dass Sie diesen Eintrag (ID: ${id}) löschen möchten?`)) { return; }
        const initialLength = allStoredEntries.length;
        allStoredEntries = allStoredEntries.filter(entry => entry.id !== id);
        if (allStoredEntries.length < initialLength) {
            saveEntriesToLocalStorage(allStoredEntries);
            renderSortedHistory(allStoredEntries, true);
        } else {
            alert("Fehler: Eintrag nicht gefunden.");
        }
    }

    function resetData() {
        if (!confirm("WARNUNG! Sind Sie sicher, dass Sie ALLE Einträge löschen möchten? Dieser Vorgang kann nicht rückgängig gemacht werden!")) { return; }
        
        if (confirm("Sollen auch Ihre dauerhaft gespeicherten Vitaldaten (Geburtsdatum und Größe) gelöscht werden?")) {
            try {
                localStorage.removeItem(getUserVitalInfoKey()); 
                userVitalInfo = {};
            } catch (e) {
                 console.error("Fehler beim Löschen der Benutzer-Vitaldaten:", e);
            }
        }

        resetButton.disabled = true;
        resetStatusEl.textContent = 'Lösche alle Daten...';
        resetStatusEl.className = 'mt-3 text-center text-sm font-medium text-yellow-600 h-4';
        try {
            localStorage.removeItem(getLocalStorageKey()); 
            allStoredEntries = []; 
            resetStatusEl.textContent = `Erfolgreich alle Einträge für Benutzer "${activeUser}" gelöscht!`;
            resetStatusEl.className = 'mt-3 text-center text-sm font-medium text-green-600 h-4';
            yearFilterEl.value = 'all';
            monthFilterEl.value = 'all';
            renderSortedHistory([], true); 
            setupApp(); 
        } catch (error) {
            console.error("Fehler beim Löschen der Einträge:", error);
            resetStatusEl.textContent = 'Fehler beim Löschen.';
            resetStatusEl.className = 'mt-3 text-center text-sm font-medium text-red-600 h-4';
        } finally {
            resetButton.disabled = false;
            setTimeout(() => { resetStatusEl.textContent = ''; }, 3000);
        }
    }
    
    function exportData() {
        const allEntries = allStoredEntries;
        const exportObject = {
            activeUser: activeUser, 
            entries: allEntries,
            userVitalInfo: userVitalInfo,
            
            userList: getSavedUsers() 
        };

        if (allEntries.length === 0 && Object.keys(userVitalInfo).length === 0) { 
            alert("Es sind keine Einträge oder Benutzerdaten zum Exportieren vorhanden!"); 
            return; 
        }

        const dataStr = JSON.stringify(exportObject, null, 2); 
        const blob = new Blob([dataStr], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const now = new Date();
        const filename = `stimmungs_backup_${activeUser}_${now.toISOString().split('T')[0]}.json`;
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importData() {
        const file = jsonFileInput.files[0];
        if (!file) { alert("Bitte wählen Sie eine JSON-Datei aus."); return; }
        importButton.disabled = true;
        importStatusEl.textContent = 'Importiere...';
        importStatusEl.className = 'mt-3 text-center text-sm font-medium text-blue-600 h-4';
        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const importedData = JSON.parse(e.target.result);
                let importedEntries = [];
                let importedUserVitalInfo = {};
                let importedUserList = getSavedUsers();
                let targetUser = activeUser;

                if (importedData.entries && Array.isArray(importedData.entries)) {

                    importedEntries = importedData.entries;
                    importedUserVitalInfo = importedData.userVitalInfo || {};
                    if (importedData.activeUser) { targetUser = importedData.activeUser; }
                    if (importedData.userList && Array.isArray(importedData.userList)) {
                        importedUserList = [...new Set([...importedUserList, ...importedData.userList])];
                        saveUsers(importedUserList);
                    }
                } else if (Array.isArray(importedData)) { 

                    importedEntries = importedData;
                } else {
                     throw new Error("Die Datei ist kein gültiges Backup-Format. Erwartet wurde ein JSON-Array ([...]) oder ein Objekt mit dem Schlüssel 'entries'."); 
                }

                if (targetUser !== activeUser) {
                    if (!confirm(`Die Backup-Datei scheint für den Benutzer "${targetUser}" zu sein. Möchten Sie zum Benutzer wechseln, um die Daten zu importieren? Andernfalls werden sie in den aktiven Benutzer ("${activeUser}") importiert.`)) {
                         targetUser = activeUser;
                    } else {
                        switchToUser(targetUser); 
                        return;
                    }
                }


                let entriesAdded = 0;
                let entriesOverwritten = 0;

                
                importedEntries.forEach(entry => {
                    const docId = entry.date + '_' + entry.timePeriod;
                    entry.id = docId; 
                    entry.schmerzRegionen = Array.isArray(entry.schmerzRegionen) ? entry.schmerzRegionen : [];
                    
                    if (entry.geburtsdatum === undefined && importedUserVitalInfo.geburtsdatum) {
                        entry.geburtsdatum = importedUserVitalInfo.geburtsdatum;
                        entry.alter = calculateAge(entry.geburtsdatum);
                    }
                    if (entry.koerpergroesse === undefined && importedUserVitalInfo.koerpergroesse) {
                        entry.koerpergroesse = importedUserVitalInfo.koerpergroesse;
                    }
                    if (entry.bmi === undefined) {
                        entry.bmi = calculateBMI(entry.gewicht, entry.koerpergroesse);
                    }

                    const existingIndex = allStoredEntries.findIndex(e => e.id === docId);
                    if (existingIndex > -1) {
                        allStoredEntries[existingIndex] = entry;
                        entriesOverwritten++;
                    } else {
                        allStoredEntries.push(entry);
                        entriesAdded++;
                    }
                });
                
                
                if (importedUserVitalInfo.geburtsdatum || importedUserVitalInfo.koerpergroesse) {
                    saveUserVitalInfo(
                        importedUserVitalInfo.geburtsdatum || userVitalInfo.geburtsdatum || null,
                        importedUserVitalInfo.koerpergroesse || userVitalInfo.koerpergroesse || null
                    );
                }


                saveEntriesToLocalStorage(allStoredEntries);
                yearFilterEl.value = 'all';
                monthFilterEl.value = 'all';
                
                setupApp(); 
                
                importStatusEl.textContent = `Import erfolgreich für Benutzer "${activeUser}"! ${entriesAdded} neu, ${entriesOverwritten} überschrieben.`;
                importStatusEl.className = 'mt-3 text-center text-sm font-medium text-green-600 h-4';
            } catch (error) {
                console.error("Fehler beim Importieren oder Parsen:", error);
                importStatusEl.textContent = `Importfehler: ${error.message}`;
                importStatusEl.className = 'mt-3 text-center text-sm font-medium text-red-600 h-4';
            } finally {
                importButton.disabled = false;
                jsonFileInput.value = ''; 
            }
        };

        reader.onerror = function() {
            importStatusEl.textContent = 'Fehler beim Lesen der Datei.';
            importStatusEl.className = 'mt-3 text-center text-sm font-medium text-red-600 h-4';
            importButton.disabled = false;
        };

        reader.readAsText(file);
    }

    function formatDate(dateString) {
        try {
            const [year, month, day] = dateString.split('-').map(Number);
            const date = new Date(Date.UTC(year, month - 1, day)); 
            return date.toLocaleDateString('de-DE', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            });
        } catch (e) {
            return dateString;
        }
    }

    window.formatDateShort = function(dateString) {
        try {
            const [year, month, day] = dateString.split('-').map(Number);
            const date = new Date(Date.UTC(year, month - 1, day)); 
            return date.toLocaleDateString('de-DE', { 
                weekday: 'short', day: 'numeric', month: 'short' 
            }).replace(/\./g, '').trim(); 
        } catch (e) {
            return dateString;
        }
    }

    let moodChartInstance = null;
    const chartStatusEl = document.getElementById('chart-status');
    const moodChartEl = document.getElementById('moodChart'); 
    const chartContainerEl = document.getElementById('chart-container'); 
    let painRegionChartInstance = null;
    const painRegionChartEl = document.getElementById('painRegionChart');
    const painChartStatusEl = document.getElementById('pain-chart-status');
    let vitalChartInstance = null;
    const vitalChartEl = document.getElementById('vitalChart');
    const vitalChartStatusEl = document.getElementById('vital-chart-status');
    const vitalChartContainerEl = document.getElementById('vital-chart-container');

    const TEMP_MIN = -5;  
    const TEMP_MAX = 25;  
    const TEMP_RANGE = TEMP_MAX - TEMP_MIN; 

    function normalizeTemperature(temp) {
        if (temp === null || temp === undefined) return null;
        if (TEMP_RANGE === 0) return 5; 
        let clampedTemp = Math.max(TEMP_MIN, Math.min(TEMP_MAX, temp)); 
        return ((clampedTemp - TEMP_MIN) / TEMP_RANGE) * 10;
    }

    function denormalizeTemperature(normalizedValue) {
        if (normalizedValue === null || normalizedValue === undefined) return null;
        return (normalizedValue / 10 * TEMP_RANGE) + TEMP_MIN;
    }


	function renderMoodChart(entries) {
		if (typeof Chart === 'undefined') return;
		if (moodChartInstance) moodChartInstance.destroy();

		const dailyData = entries.reduce((acc, entry) => {
			const dateKey = entry.date;
			const moodValue = window.MOOD_VALUES[entry.mood] || 3;
			if (!acc[dateKey]) { 
				acc[dateKey] = { moodSum: 0, moodCount: 0, tempSum: 0, tempCount: 0, painSum: 0, painCount: 0, sleepSum: 0, sleepCount: 0 }; 
			}
			acc[dateKey].moodSum += moodValue;
			acc[dateKey].moodCount++;
			if (entry.temperature !== undefined && entry.temperature !== null) { 
				acc[dateKey].tempSum += entry.temperature; 
				acc[dateKey].tempCount++; 
			}
			if (entry.pain != null) { acc[dateKey].painSum += entry.pain; acc[dateKey].painCount++; }
			if (entry.sleepQuality) { acc[dateKey].sleepSum += entry.sleepQuality; acc[dateKey].sleepCount++; }
			return acc;
		}, {});

		const sortedDates = Object.keys(dailyData).sort();
		const chartData = sortedDates.map(date => {
			const d = dailyData[date];
			const avgTemp = d.tempCount > 0 ? d.tempSum / d.tempCount : null;
			return {
				date,
				mood: d.moodCount > 0 ? d.moodSum / d.moodCount : null,
				// Hier wird die Temperatur wieder für die 0-10 Skala umgerechnet
				tempNormalized: avgTemp !== null ? normalizeTemperature(avgTemp) : null,
				tempOriginal: avgTemp,
				sleep: d.sleepCount > 0 ? d.sleepSum / d.sleepCount : null,
				pain: d.painCount > 0 ? d.painSum / d.painCount : null
			};
		});

		if (chartData.length === 0) return;

		const PIXELS_PER_POINT = 55; 
		const minWidth = chartContainerEl.parentElement.clientWidth;
		const targetWidth = Math.max(minWidth, chartData.length * PIXELS_PER_POINT);

		moodChartEl.width = targetWidth; 
		moodChartEl.height = 350; 
		moodChartEl.style.width = targetWidth + "px";
		moodChartEl.style.height = "350px";

		const ctx = moodChartEl.getContext('2d');
		moodChartInstance = new Chart(ctx, {
			type: 'line',
			data: {
				labels: chartData.map(d => window.formatDateShort(d.date)),
				datasets: [
					{ label: 'Ø Stimmung', data: chartData.map(d => d.mood), borderColor: '#4f46e5', tension: 0.3, pointRadius: 6, yAxisID: 'yMood', borderWidth: 2 },
					{ label: 'Ø Schmerz', data: chartData.map(d => d.pain), borderColor: '#9333ea', tension: 0.3, pointRadius: 6, yAxisID: 'yPain', borderWidth: 2 },
					{ label: 'Ø Schlaf', data: chartData.map(d => d.sleep), borderColor: '#facc15', showLine: false, pointStyle: 'star', pointRadius: 6, yAxisID: 'yMood' },
					{ label: 'Ø Temp', data: chartData.map(d => d.tempNormalized), borderColor: '#ef4444', tension: 0.3, pointRadius: 6, yAxisID: 'yPain', borderWidth: 2 }
				]
			},
			options: {
				responsive: false,
				maintainAspectRatio: false,
				scales: {
					x: { ticks: { font: { size: 11 }, maxRotation: 45, minRotation: 45 } },
					yMood: {
						type: 'linear', position: 'left', min: 1, max: 5,
						title: { display: true, text: 'Stimmung / Schlaf', font: { size: 10 } },
						ticks: { stepSize: 1 }
					},
					yPain: {
						type: 'linear', position: 'right', min: 0, max: 10,
						title: { display: true, text: 'Schmerz (0-10) / Temp (-5 bis 25°C)', font: { size: 10 } },
						grid: { drawOnChartArea: false },
						ticks: {
							stepSize: 2,
							callback: function(value) {
								// Diese Funktion zeigt zusätzlich zur 0-10 Skala die Gradzahlen an
								const temp = denormalizeTemperature(value);
								return value + " ( " + temp.toFixed(0) + "°C)";
							}
						}
					}
				},
				plugins: {
					tooltip: {
						callbacks: {
							label: function(context) {
								let label = context.dataset.label || '';
								if (label === 'Ø Temp') {
									const realTemp = chartData[context.dataIndex].tempOriginal;
									return label + ': ' + (realTemp !== null ? realTemp.toFixed(1) + ' °C' : 'N/A');
								}
								return label + ': ' + context.parsed.y.toFixed(1);
							}
						}
					},
					legend: { labels: { boxWidth: 10, font: { size: 10 } } }
				}
			}
		});

		setTimeout(() => { chartContainerEl.scrollLeft = chartContainerEl.scrollWidth; }, 100);
	}




	function renderVitalChart(entries) {
	    if (typeof Chart === 'undefined') return;
	    if (vitalChartInstance) vitalChartInstance.destroy();
	
	    const dataToUse = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
	    
	    if (dataToUse.length === 0) {
	        if (typeof vitalChartStatusEl !== 'undefined') vitalChartStatusEl.classList.remove('hidden');
	        return;
	    }
	    if (typeof vitalChartStatusEl !== 'undefined') vitalChartStatusEl.classList.add('hidden');
	
	    const PIXELS_PER_POINT = 60; 
	    const parentWidth = vitalChartContainerEl.parentElement.clientWidth;
	    const targetWidth = Math.max(parentWidth, dataToUse.length * PIXELS_PER_POINT);
	
	    vitalChartEl.width = targetWidth; 
	    vitalChartEl.height = 350; 
	    vitalChartEl.style.width = targetWidth + "px";
	    vitalChartEl.style.height = "350px";
	
	    const ctx = vitalChartEl.getContext('2d');
	    vitalChartInstance = new Chart(ctx, {
	        type: 'line',
	        data: {
	            labels: dataToUse.map(e => window.formatDateShort ? window.formatDateShort(e.date) : e.date),
	            datasets: [
	                {
	                    label: 'Blutdruck (Sys)',
	                    data: dataToUse.map(e => e.blutdruckSys ? parseFloat(e.blutdruckSys) : null),
	                    borderColor: '#6b7280',
	                    borderWidth: 2,
	                    tension: 0.3,
						pointRadius: 6, 
	                    yAxisID: 'yPressure',
	                    spanGaps: true
	                },
	                {
	                    label: 'Blutdruck (Dia)',
	                    data: dataToUse.map(e => e.blutdruckDia ? parseFloat(e.blutdruckDia) : null),
	                    borderColor: '#3b82f6',
	                    borderWidth: 2,
	                    tension: 0.3,
						pointRadius: 6, 
	                    yAxisID: 'yPressure',
	                    spanGaps: true
	                },
	                {
	                    label: 'Blutzucker',
	                    data: dataToUse.map(e => e.blutzucker ? parseFloat(e.blutzucker) : null),
	                    borderColor: '#f59e0b',
	                    borderWidth: 2,
	                    tension: 0.3,
						pointRadius: 6, 
	                    yAxisID: 'ySugar',
	                    spanGaps: true
	                },	
	                {
	                    label: 'Puls',
	                    data: dataToUse.map(e => e.puls ? parseFloat(e.puls) : null), // KORRIGIERT: e.puls statt e.pulse
	                    borderColor: '#10b981',
	                    borderWidth: 2,
	                    tension: 0.3,
						pointRadius: 6, 
	                    yAxisID: 'yPulse',
	                    spanGaps: true
	                },
	                {
	                    label: 'Gewicht (kg)',
	                    data: dataToUse.map(e => e.gewicht ? parseFloat(e.gewicht) : null), // KORRIGIERT: e.gewicht statt e.weight
	                    borderColor: '#db2777',
	                    borderWidth: 2,
	                    borderDash: [5, 5],
	                    tension: 0.3,
						pointRadius: 6, 
	                    yAxisID: 'yPulse',
	                    spanGaps: true
	                },
	                {
	                    label: 'BMI',
	                    data: dataToUse.map(e => (e.bmi && e.bmi !== 'N/A') ? parseFloat(e.bmi) : null),
	                    borderColor: '#4c51bf',
	                    borderWidth: 2,
	                    tension: 0.3,
						pointRadius: 6, 
	                    yAxisID: 'yPulse',
	                    spanGaps: true
	                }
	            ]
	        },
	        options: {
	            responsive: false,
	            maintainAspectRatio: false,
	            scales: {
	                x: { ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 45 } },
	                yPressure: {
	                    type: 'linear',
	                    position: 'left',
	                    beginAtZero: false,
	                    title: { display: true, text: 'Blutdruck', font: { size: 9 } }
	                },
	                yPulse: {
	                    type: 'linear',
	                    position: 'right',
	                    beginAtZero: false,
	                    grid: { drawOnChartArea: false },
	                    title: { display: true, text: 'Puls / kg / BMI', font: { size: 9 } },
	                    ticks: { font: { size: 9 } }
	                },
	                ySugar: {
	                    type: 'linear',
	                    position: 'right',
	                    beginAtZero: false,
	                    grid: { drawOnChartArea: false },
	                    title: { display: true, text: 'Zucker', font: { size: 9 } },
	                    ticks: { font: { size: 9 } }
	                }                       
	            }
	        }
	    });
	
	    setTimeout(() => {
	        vitalChartContainerEl.scrollLeft = vitalChartContainerEl.scrollWidth;
	    }, 100);
	}

    function renderPainRegionChart(entries) {
        if (typeof Chart === 'undefined') { console.error("Chart.js ist nicht geladen."); return; }
        if (painRegionChartInstance) { painRegionChartInstance.destroy(); }
        
        const dataToUse = entries; 
        const regionCounts = { 'oben': 0, 'mitte': 0, 'unten': 0 };
        let totalCount = 0;

        dataToUse.forEach(entry => {
            if (entry.schmerzRegionen && Array.isArray(entry.schmerzRegionen)) {
                entry.schmerzRegionen.forEach(region => {
                    if (regionCounts.hasOwnProperty(region)) {
                        regionCounts[region]++;
                        totalCount++;
                    }
                });
            }
        });
        
        if (totalCount === 0) {
            painChartStatusEl.classList.remove('hidden');
            exportPainChartButton.disabled = true;
            return;
        }
        painChartStatusEl.classList.add('hidden');
        exportPainChartButton.disabled = false;

        const labels = Object.keys(regionCounts).map(key => PAIN_REGION_NAMES[key]);
        const data = Object.values(regionCounts);
        
        const backgroundColors = [
            'rgba(147, 51, 234, 0.8)', 
            'rgba(192, 132, 252, 0.8)', 
            'rgba(233, 213, 255, 0.8)' 
        ];
        
        const borderColors = [
            'rgb(147, 51, 234)',
            'rgb(192, 132, 252)',
            'rgb(233, 213, 255)'
        ];

        const ctx = painRegionChartEl.getContext('2d');
        painRegionChartInstance = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Häufigkeit der Schmerzregionen',
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { boxWidth: 20 }
                    },
                    title: {
                        display: true,
                        text: `Gesamte Schmerzereignisse: ${totalCount}`,
                        font: { size: 16 }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const count = context.parsed;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0); 
                                const percentage = total === 0 ? '0.0%' : ((count / total) * 100).toFixed(1) + '%';
                                
                                return `${context.label}: ${count} mal (${percentage})`;
                            }
                        }
                    }
                }
            }
        });
    }

    setupFormListeners(); 
    setupApp(); 

    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
          .then(registration => {
            console.log('ServiceWorker-Registrierung erfolgreich:', registration);
          })
          .catch(err => {
            console.error('ServiceWorker-Registrierung fehlgeschlagen:', err);
          });
      });
    }