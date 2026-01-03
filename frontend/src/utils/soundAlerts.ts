

class SoundAlerts {
  private audioContext: AudioContext | null = null;
  private duplicateAlertInterval: NodeJS.Timeout | null = null;
  private unknownStudentInterval: NodeJS.Timeout | null = null;

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  // Play success sound for IP camera verification
  playIPCameraSuccess() {
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 1000;
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  }

  // Play failure sound for IP camera verification
  playIPCameraFail() {
    const ctx = this.getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.frequency.value = 400;
    oscillator.type = 'sawtooth';

    gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 1.0);
  }

  // Play continuous alert sound for duplicate entry until stopped
  startDuplicateEntryAlert() {
    this.stopDuplicateEntryAlert(); // Clear any existing alert
    
    const playBeep = () => {
      const ctx = this.getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.6, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.8);
    };

    // Play immediately
    playBeep();
    
    // Continue playing every 1 second
    this.duplicateAlertInterval = setInterval(playBeep, 1000);
  }

  stopDuplicateEntryAlert() {
    if (this.duplicateAlertInterval) {
      clearInterval(this.duplicateAlertInterval);
      this.duplicateAlertInterval = null;
    }
  }

  // Play continuous alert sound for unknown student until stopped
  startUnknownStudentAlert() {
    this.stopUnknownStudentAlert(); // Clear any existing alert
    
    const playBeep = () => {
      const ctx = this.getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = 600;
      oscillator.type = 'square';

      gainNode.gain.setValueAtTime(0.7, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.5);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 1.5);
    };

    // Play immediately
    playBeep();
    
    // Continue playing every 2 seconds
    this.unknownStudentInterval = setInterval(playBeep, 2000);
  }

  stopUnknownStudentAlert() {
    if (this.unknownStudentInterval) {
      clearInterval(this.unknownStudentInterval);
      this.unknownStudentInterval = null;
    }
  }
}

export const soundAlerts = new SoundAlerts();
