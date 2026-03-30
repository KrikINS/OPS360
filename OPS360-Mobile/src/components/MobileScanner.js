import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Audio } from 'expo-av';
import { Zap, RefreshCw, X, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PermissionGuard from './PermissionGuard';

export default function MobileScanner({ onClose, onScan }) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [isFaceMode, setIsFaceMode] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Play audio feedbacks
  const playSound = async (type) => {
    const { sound } = await Audio.Sound.createAsync(
      type === 'success' 
        ? { uri: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3' } // Success Beep
        : { uri: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3' } // Error Beep
    );
    await sound.playAsync();
  };

  const handleBarcodeScanned = useCallback(async ({ data }) => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    // Phase 2: Financial Auditor Validation Logic
    const result = onScan(data); // Call validateScan from Context
    
    if (!result.success) {
      await playSound('error');
      setLastScan({ data, status: 'error', message: result.message });
    } else {
      await playSound('success');
      setLastScan({ data, status: 'success', message: result.message });
    }
    
    setTimeout(() => {
      setLastScan(null);
      setIsProcessing(false);
    }, 2000);
  }, [isProcessing, onScan]);

  return (
    <PermissionGuard permission={permission} requestPermission={requestPermission}>
      <View style={styles.container}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing={isFaceMode ? 'front' : 'back'}
          enableTorch={isTorchOn}
          onBarcodeScanned={handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['code128', 'ean13', 'upc_a'] }}
        />
        
        {/* Target Box Overlay */}
        <View style={styles.overlay}>
          <View style={styles.targetFrame}>
             <View style={[styles.corner, styles.tl]} />
             <View style={[styles.corner, styles.tr]} />
             <View style={[styles.corner, styles.bl]} />
             <View style={[styles.corner, styles.br]} />
             {isProcessing && <View style={styles.scanLine} />}
          </View>
        </View>

        {/* Top Header UI */}
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
            <View>
                <Text style={styles.title}>Vision Hub</Text>
                <Text style={styles.subtitle}>{isFaceMode ? 'Front Lens' : 'Rear Lens Active'}</Text>
            </View>
            <View style={styles.controls}>
               <TouchableOpacity style={[styles.iconBtn, isTorchOn && styles.iconBtnActive]} onPress={() => setIsTorchOn(!isTorchOn)}>
                  <Zap size={20} color={isTorchOn ? '#000' : '#FFF'} />
               </TouchableOpacity>
               <TouchableOpacity style={styles.iconBtn} onPress={() => setIsFaceMode(!isFaceMode)}>
                  <RefreshCw size={20} color="#FFF" />
               </TouchableOpacity>
               <TouchableOpacity style={[styles.iconBtn, styles.exitBtn]} onPress={onClose}>
                  <X size={20} color="#FFF" />
               </TouchableOpacity>
            </View>
        </View>

        {/* Scan Results Feedback Panel */}
        {lastScan && (
          <View style={[styles.feedback, lastScan.status === 'success' ? styles.success : styles.error]}>
             {lastScan.status === 'success' ? <CheckCircle2 color="#FFF" /> : <AlertCircle color="#FFF" />}
             <View>
                <Text style={styles.feedbackText}>{lastScan.data}</Text>
                <Text style={styles.feedbackSub}>{lastScan.message}</Text>
             </View>
          </View>
        )}
      </View>
    </PermissionGuard>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  targetFrame: { width: 300, height: 120, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 24, position: 'relative' },
  header: { 
    position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 24, 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)' 
  },
  title: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  subtitle: { color: '#3B82F6', fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
  controls: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 12, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.1)', borderWeight: 1, borderColor: 'rgba(255,255,255,0.1)' },
  iconBtnActive: { backgroundColor: '#FBBF24' },
  exitBtn: { backgroundColor: '#F43F5E' },
  corner: { position: 'absolute', width: 24, height: 24, borderColor: '#3B82F6', borderWidth: 4 },
  tl: { top: -2, left: -2, borderBottomWidth: 0, borderRightWidth: 0, borderTopLeftRadius: 18 },
  tr: { top: -2, right: -2, borderBottomWidth: 0, borderLeftWidth: 0, borderTopRightRadius: 18 },
  bl: { bottom: -2, left: -2, borderTopWidth: 0, borderRightWidth: 0, borderBottomLeftRadius: 18 },
  br: { bottom: -2, right: -2, borderTopWidth: 0, borderLeftWidth: 0, borderBottomRightRadius: 18 },
  btn: { marginTop: 24, padding: 16, backgroundColor: '#3B82F6', borderRadius: 12 },
  btnText: { color: '#FFF', fontWeight: 'bold' },
  msg: { color: '#FFF', fontSize: 16, textAlign: 'center' },
  feedback: { position: 'absolute', bottom: 40, left: 40, right: 40, padding: 20, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
  success: { backgroundColor: '#10B981' },
  error: { backgroundColor: '#EF4444' },
  feedbackText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  feedbackSub: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '700', marginTop: 2 },
  scanLine: { position: 'absolute', height: 2, backgroundColor: '#3B82F6', left: 10, right: 10, top: '50%' }
});
