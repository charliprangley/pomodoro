class PomodoroTimer {
    constructor() {
        // Timer state
        this.currentMode = 'pomodoro';
        this.isRunning = false;
        this.isPaused = false;
        this.timeLeft = 25 * 60; // 25 minutes in seconds
        this.originalTime = 25 * 60;
        this.timerInterval = null;
        this.sessionCount = 0;
        this.pomodoroCount = 0;
        
        // Settings
        this.settings = {
            pomodoro: 25,
            shortBreak: 5,
            longBreak: 15,
            autoStart: false,
            soundEnabled: true
        };

        // Statistics
        this.todayStats = {
            pomodoros: 0,
            focusTime: 0,
            breakTime: 0,
            date: new Date().toDateString()
        };

        // DOM elements
        this.timeDisplay = document.getElementById('timeDisplay');
        this.modeText = document.getElementById('modeText');
        this.startBtn = document.getElementById('startBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.sessionCountElement = document.getElementById('sessionCount');
        this.nextSessionElement = document.getElementById('nextSession');
        this.progressRing = document.querySelector('.progress-ring-progress');
        this.timerContainer = document.querySelector('.timer-container');
        this.tabContainer = document.querySelector('.tab-container');
        this.notificationSound = document.getElementById('notificationSound');

        // Mode buttons
        this.modeButtons = document.querySelectorAll('.mode-btn');
        
        // Settings elements
        this.settingsToggle = document.getElementById('settingsToggle');
        this.settingsContent = document.getElementById('settingsContent');
        this.pomodoroLengthInput = document.getElementById('pomodoroLength');
        this.shortBreakLengthInput = document.getElementById('shortBreakLength');
        this.longBreakLengthInput = document.getElementById('longBreakLength');
        this.autoStartInput = document.getElementById('autoStart');
        this.soundEnabledInput = document.getElementById('soundEnabled');

        // Stats elements
        this.todayPomodorosElement = document.getElementById('todayPomodoros');
        this.todayFocusTimeElement = document.getElementById('todayFocusTime');
        this.todayBreakTimeElement = document.getElementById('todayBreakTime');

        // Initialize
        this.init();
    }

    init() {
        this.loadSettings();
        this.loadStats();
        this.updateDisplay();
        this.updateProgress(100);
        this.updateStats();
        this.bindEvents();
        this.updateNextSession();
        
        // Request notification permission
        if ('Notification' in window) {
            Notification.requestPermission();
        }
    }

    bindEvents() {
        // Control buttons
        this.startBtn.addEventListener('click', () => this.start());
        this.pauseBtn.addEventListener('click', () => this.pause());
        this.resetBtn.addEventListener('click', () => this.reset());

        // Mode buttons
        this.modeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                if (!this.isRunning) {
                    this.switchMode(e.target.dataset.mode);
                }
            });
        });

        // Settings
        this.settingsToggle.addEventListener('click', () => this.toggleSettings());
        
        // Settings inputs
        this.pomodoroLengthInput.addEventListener('change', () => this.saveSettings());
        this.shortBreakLengthInput.addEventListener('change', () => this.saveSettings());
        this.longBreakLengthInput.addEventListener('change', () => this.saveSettings());
        this.autoStartInput.addEventListener('change', () => this.saveSettings());
        this.soundEnabledInput.addEventListener('change', () => this.saveSettings());

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !e.target.matches('input')) {
                e.preventDefault();
                this.isRunning ? this.pause() : this.start();
            } else if (e.code === 'KeyR' && !e.target.matches('input')) {
                e.preventDefault();
                this.reset();
            }
        });

        // Close settings when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.settingsToggle.contains(e.target) && !this.settingsContent.contains(e.target)) {
                this.settingsContent.classList.add('hidden');
            }
        });

        // Page visibility API for notification
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isRunning) {
                document.title = `${this.formatTime(this.timeLeft)} - Pomodoro Timer`;
            } else {
                document.title = 'Pomodoro Timer';
            }
        });
    }

    start() {
        this.isRunning = true;
        this.isPaused = false;
        this.startBtn.classList.add('hidden');
        this.pauseBtn.classList.remove('hidden');

        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            this.updateDisplay();
            this.updateProgress();

            if (this.timeLeft <= 0) {
                this.completeSession();
            }
        }, 1000);
    }

    pause() {
        this.isRunning = false;
        this.isPaused = true;
        clearInterval(this.timerInterval);
        
        this.startBtn.classList.remove('hidden');
        this.pauseBtn.classList.add('hidden');
    }

    reset() {
        this.isRunning = false;
        this.isPaused = false;
        clearInterval(this.timerInterval);
        
        this.timeLeft = this.originalTime;
        this.updateDisplay();
        this.updateProgress(100);
        
        this.startBtn.classList.remove('hidden');
        this.pauseBtn.classList.add('hidden');
    }

    completeSession() {
        this.isRunning = false;
        clearInterval(this.timerInterval);
        
        // Update statistics
        if (this.currentMode === 'pomodoro') {
            this.sessionCount++;
            this.pomodoroCount++;
            this.todayStats.pomodoros++;
            this.todayStats.focusTime += this.settings.pomodoro;
        } else {
            const breakTime = this.currentMode === 'short-break' ? 
                this.settings.shortBreak : this.settings.longBreak;
            this.todayStats.breakTime += breakTime;
        }

        this.saveStats();
        this.updateStats();
        this.sessionCountElement.textContent = this.sessionCount;

        // Show notification
        this.showNotification();
        
        // Play sound
        if (this.settings.soundEnabled) {
            this.playNotificationSound();
        }

        // Add shake animation
        this.timerContainer.classList.add('shake');
        setTimeout(() => {
            this.timerContainer.classList.remove('shake');
        }, 500);

        // Auto-switch to next mode
        this.autoSwitchMode();
    }

    autoSwitchMode() {
        let nextMode;
        
        if (this.currentMode === 'pomodoro') {
            // After every 4 pomodoros, take a long break
            nextMode = (this.pomodoroCount % 4 === 0) ? 'long-break' : 'short-break';
        } else {
            // After any break, go back to pomodoro
            nextMode = 'pomodoro';
        }

        this.switchMode(nextMode);
        this.updateNextSession();

        // Auto-start if enabled
        if (this.settings.autoStart) {
            setTimeout(() => {
                this.start();
            }, 2000); // 2 second delay before auto-start
        } else {
            this.startBtn.classList.remove('hidden');
            this.pauseBtn.classList.add('hidden');
        }
    }

    switchMode(mode) {
        if (this.isRunning) return;

        this.currentMode = mode;
        
        // Update active button
        this.modeButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.mode === mode) {
                btn.classList.add('active');
            }
        });

        // Update timer
        switch (mode) {
            case 'pomodoro':
                this.timeLeft = this.settings.pomodoro * 60;
                this.originalTime = this.settings.pomodoro * 60;
                this.modeText.textContent = 'Focus Time';
                this.timerContainer.className = 'timer-container pomodoro';
                this.tabContainer.className = 'tab-container pomodoro';
                break;
            case 'short-break':
                this.timeLeft = this.settings.shortBreak * 60;
                this.originalTime = this.settings.shortBreak * 60;
                this.modeText.textContent = 'Short Break';
                this.timerContainer.className = 'timer-container short-break';
                this.tabContainer.className = 'tab-container short-break';
                break;
            case 'long-break':
                this.timeLeft = this.settings.longBreak * 60;
                this.originalTime = this.settings.longBreak * 60;
                this.modeText.textContent = 'Long Break';
                this.timerContainer.className = 'timer-container long-break';
                this.tabContainer.className = 'tab-container long-break';
                break;
        }

        this.updateDisplay();
        this.updateProgress(100);
        this.updateNextSession();
    }

    updateDisplay() {
        this.timeDisplay.textContent = this.formatTime(this.timeLeft);
        
        // Update page title when timer is running
        if (this.isRunning && document.hidden) {
            document.title = `${this.formatTime(this.timeLeft)} - Pomodoro Timer`;
        }
    }

    updateProgress(percentage = null) {
        if (percentage === null) {
            percentage = (this.timeLeft / this.originalTime) * 100;
        }
        
        const circumference = 2 * Math.PI * 140; // radius = 140
        const offset = circumference - (percentage / 100) * circumference;
        this.progressRing.style.strokeDashoffset = offset;
    }

    updateNextSession() {
        let nextSession;
        
        if (this.currentMode === 'pomodoro') {
            nextSession = (this.pomodoroCount % 4 === 3) ? 'Long Break' : 'Short Break';
        } else {
            nextSession = 'Pomodoro';
        }
        
        this.nextSessionElement.textContent = `Next: ${nextSession}`;
    }

    formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    showNotification() {
        if ('Notification' in window && Notification.permission === 'granted') {
            let title, body;
            
            if (this.currentMode === 'pomodoro') {
                title = '🍅 Pomodoro Complete!';
                body = 'Great work! Time for a break.';
            } else {
                title = '☕ Break Complete!';
                body = 'Break time is over. Ready to focus?';
            }

            new Notification(title, {
                body: body,
                icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMzIiIGN5PSIzMiIgcj0iMzIiIGZpbGw9IiM2NjdlZWEiLz4KPHN2ZyB4PSIxNiIgeT0iMTYiIHdpZHRoPSIzMiIgaGVpZ2h0PSIzMiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjEwIi8+CjxwYXRoIGQ9Im0xMiA2IDAgNiA0IDIiLz4KPC9zdmc+Cjwvc3ZnPgo='
            });
        }
    }

    playNotificationSound() {
        // Create a simple beep sound using Web Audio API
        if ('AudioContext' in window || 'webkitAudioContext' in window) {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        }
    }

    toggleSettings() {
        this.settingsContent.classList.toggle('hidden');
    }

    saveSettings() {
        this.settings = {
            pomodoro: parseInt(this.pomodoroLengthInput.value),
            shortBreak: parseInt(this.shortBreakLengthInput.value),
            longBreak: parseInt(this.longBreakLengthInput.value),
            autoStart: this.autoStartInput.checked,
            soundEnabled: this.soundEnabledInput.checked
        };

        localStorage.setItem('pomodoroSettings', JSON.stringify(this.settings));

        // Update current timer if not running
        if (!this.isRunning) {
            this.switchMode(this.currentMode);
        }
    }

    loadSettings() {
        const saved = localStorage.getItem('pomodoroSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
        }

        // Update input values
        this.pomodoroLengthInput.value = this.settings.pomodoro;
        this.shortBreakLengthInput.value = this.settings.shortBreak;
        this.longBreakLengthInput.value = this.settings.longBreak;
        this.autoStartInput.checked = this.settings.autoStart;
        this.soundEnabledInput.checked = this.settings.soundEnabled;
    }

    saveStats() {
        this.todayStats.date = new Date().toDateString();
        localStorage.setItem('pomodoroStats', JSON.stringify(this.todayStats));
    }

    loadStats() {
        const saved = localStorage.getItem('pomodoroStats');
        if (saved) {
            const stats = JSON.parse(saved);
            // Reset stats if it's a new day
            if (stats.date === new Date().toDateString()) {
                this.todayStats = stats;
            }
        }
    }

    updateStats() {
        this.todayPomodorosElement.textContent = this.todayStats.pomodoros;
        this.todayFocusTimeElement.textContent = `${this.todayStats.focusTime}m`;
        this.todayBreakTimeElement.textContent = `${this.todayStats.breakTime}m`;
    }
}

// Initialize the timer when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new PomodoroTimer();
});

// Service Worker registration for offline support (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(registrationError => console.log('SW registration failed'));
    });
}
