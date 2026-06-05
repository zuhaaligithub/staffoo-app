
import SoundPlayer from 'react-native-sound-player';

export function playSound(type) {
  try {
    const fileName = type === 'call' ? 'call' : 'alert';
    const extension = type === 'call' ? 'mp3' : 'wav';
    console.log(`[SoundPlayer] 🔊 Playing: ${fileName}.${extension}`);
    SoundPlayer.playSoundFile(fileName, extension);
  } catch (e) {
    console.error(`[SoundPlayer] ❌ Error playing sound:`, e);
  }
}
