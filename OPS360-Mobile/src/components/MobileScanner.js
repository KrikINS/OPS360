import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useScannerFeedback } from '../hooks/useScannerFeedback';
import { Zap, RefreshCw, X, CheckCircle2, AlertCircle, Camera } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { performAuditOCR } from '../utils/ocrIntelligence';
import { useMobile } from '../context/MobileContext';
import PermissionGuard from './PermissionGuard';

export default function MobileScanner({ onClose, onScan }) {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [isFaceMode, setIsFaceMode] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { playFeedback } = useScannerFeedback();

  const { expectedSerials = [] } = useMobile(); // Access audit specification

  const handleOCRFallback = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 1,
        allowsEditing: true,
        aspect: [16, 9],
      });

      if (!result.cancelled && result.assets) {
        setIsProcessing(true);
        const ocrResult = await performAuditOCR(result.assets[0].uri, expectedSerials);
        
        if (ocrResult.success) {
           // AUDITOR: Handle Partial/Suggested Match
           if (ocrResult.suggested) {
             setLastScan({ 
               data: ocrResult.data, 
               status: 'suggested', 
               message: `Partial Match: Did you mean ${ocrResult.data}?` 
             });
           } else {
             const validation = onScan(ocrResult.data);
             if (validation.success) {
               await playFeedback(true);
               setLastScan({ data: ocrResult.data, status: 'success', message: 'OCR Verified' });
             } else {
               await playFeedback(false);
               setLastScan({ data: ocrResult.data, status: 'error', message: validation.message });
             }
           }
        } else {
           setLastScan({ status: 'error', message: ocrResult.message });
        }
        setIsProcessing(false);
      }
    } catch (err) {
      console.warn('OCR Trigger Failed:', err);
    }
  };

  const handleBarcodeScanned = useCallback(async ({ data }) => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    // Phase 2: Financial Auditor Validation Logic
    const result = onScan(data); // Call validateScan from Context
    
    if (!result.success) {
      await playFeedback(false);
      setLastScan({ data, status: 'error', message: result.message });
    } else {
      await playFeedback(true);
      setLastScan({ data, status: 'success', message: result.message });
    }
    
    setTimeout(() => {
      setLastScan(null);
      setIsProcessing(false);
    }, 2000);
  }, [isProcessing, onScan, playFeedback]);

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

        {/* OCR Manual Trigger (@UI-ENGINEER) */}
        {!isProcessing && (
           <TouchableOpacity style={styles.ocrBtn} onPress={handleOCRFallback}>
              <Camera size={16} color="#FFF" />
              <Text style={styles.ocrBtnText}>CAN'T SCAN? USE PHOTO</Text>
           </TouchableOpacity>
        )}

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
  scanLine: { position: 'absolute', height: 2, backgroundColor: '#3B82F6', left: 10, right: 10, top: '50%' },
  ocrBtn: { position: 'absolute', bottom: 120, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 30, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  ocrBtnText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
  suggested: { backgroundColor: '#F59E0B' }
});
