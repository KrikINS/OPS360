import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

// Lead Directive: Pre-load sounds for zero-latency feedback (UI-ENGINEER mandated)
export const useScannerFeedback = () => {
  const successSound = useRef(null);
  const errorSound = useRef(null);

  useEffect(() => {
    // 1. Initialise & Pre-load Sounds globally to eliminate playback latency
    const loadSounds = async () => {
      try {
        const { sound: s } = await Audio.Sound.createAsync(
          { uri: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3' }, // Placeholder for success_beep.mp3
          { shouldPlay: false }
        );
        successSound.current = s;

        const { sound: e } = await Audio.Sound.createAsync(
          { uri: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3' }, // Placeholder for error_buzz.mp3
          { shouldPlay: false }
        );
        errorSound.current = e;
      } catch (err) {
        console.warn("Audio pre-load fail:", err);
      }
    };

    loadSounds();

    // 2. State Optimization: Set shouldUnload: true for iPad Mini memory safety
    return () => {
      if (successSound.current) successSound.current.unloadAsync();
      if (errorSound.current) errorSound.current.unloadAsync();
    };
  }, []);

  const playFeedback = async (isSuccess) => {
    try {
      const targetSound = isSuccess ? successSound.current : errorSound.current;
      
      // Haptic Pairing
      if (isSuccess) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      if (targetSound) {
        await targetSound.setPositionAsync(0);
        await targetSound.playAsync();
      }
    } catch (error) {
      console.log("Audio/Haptic Fail:", error);
    }
  };

  return { playFeedback };
};
