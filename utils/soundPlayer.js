import SoundPlayer from "react-native-sound-player";

const SOUND_FILES = {
  call: { fileName: "call", extension: "mp3" },
  alert: { fileName: "alert", extension: "wav" },
  // Played on the job-acceptance celebration screen. Add a success.mp3 file
  // to the native bundles the same way alert.wav / call.mp3 were added
  // (Android: android/app/src/main/res/raw/success.mp3,
  //  iOS: add success.mp3 to the Xcode project / bundle resources).
  success: { fileName: "success", extension: "mp3" },
};

export function playSound(type) {
  try {
    const { fileName, extension } = SOUND_FILES[type] || SOUND_FILES.alert;
    console.log(`[SoundPlayer] 🔊 Playing: ${fileName}.${extension}`);
    SoundPlayer.playSoundFile(fileName, extension);
  } catch (e) {
    console.error(`[SoundPlayer] ❌ Error playing sound:`, e);
  }
}
