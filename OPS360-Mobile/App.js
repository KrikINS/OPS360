import React, { useState } from 'react';
import { StyleSheet, View, Text, StatusBar, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogOut, PackageSearch, Boxes, ScanLine } from 'lucide-react-native';
import { MobileProvider, useMobile } from './src/context/MobileContext';

// Components
import SearchableCombobox from './src/components/SearchableCombobox';
import MobileScanner from './src/components/MobileScanner';

function HomeScreen() {
  const { activePO, setActivePO, commitScan } = useMobile();
  const [isCameraActive, setIsCameraActive] = useState(false);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" />
      
      {/* Background Decor */}
      <View style={styles.decor} />

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header Section */}
        <View style={styles.header}>
            <View>
              <Text style={styles.h1}>OPS360 Mobile</Text>
              <Text style={styles.h2}>Inventory Management System</Text>
            </View>
            <TouchableOpacity style={styles.logout}>
               <LogOut size={20} color="#64748B" />
            </TouchableOpacity>
        </View>

        {/* Phase 2: Selection & Status Tracking */}
        <View style={styles.card}>
           <Text style={styles.cardTitle}>Phase 2: PO Selection</Text>
           <SearchableCombobox onSelect={(po) => setActivePO(po)} />
           
           {activePO && (
             <View style={styles.poSummary}>
                <View style={styles.tag}><Text style={styles.tagText}>Active PO: {activePO.id}</Text></View>
                <View style={styles.tagBlue}><Text style={styles.tagTextBlue}>Vendor: {activePO.vendor}</Text></View>
             </View>
           )}
           
           {scannedItems.length > 0 && (
              <TouchableOpacity style={styles.finishBtn} onPress={finishSession}>
                 <Text style={styles.finishBtnText}>Finish & Short-Close</Text>
                 <View style={styles.countBadge}><Text style={styles.countText}>{scannedItems.length}</Text></View>
              </TouchableOpacity>
           )}
        </View>

        {/* Main Action Launchers */}
        <View style={styles.grid}>
           <TouchableOpacity 
             style={[styles.action, !activePO && styles.actionDisabled]} 
             onPress={() => setIsCameraActive(true)}
             disabled={!activePO}
           >
              <View style={styles.actionIcon}><ScanLine size={32} color="#FFF" /></View>
              <Text style={styles.actionLabel}>Process GRN</Text>
              {!activePO && <Text style={styles.actionWarning}>Select PO First</Text>}
           </TouchableOpacity>

           <TouchableOpacity style={styles.actionGold}>
              <View style={styles.actionIconGold}><Boxes size={32} color="#FFF" /></View>
              <Text style={styles.actionLabel}>Active Stock</Text>
           </TouchableOpacity>
        </View>

        {/* Footer info */}
        <View style={styles.footer}>
           <PackageSearch size={16} color="#94A3B8" />
           <Text style={styles.footerText}>Enterprise Hub v1.0.4 - Region: Karachi</Text>
        </View>
      </ScrollView>

      {/* Full-Screen Scanner Overlay */}
      {isCameraActive && (
        <MobileScanner 
            onClose={() => setIsCameraActive(false)} 
            onScan={commitScan} 
            expectedSerials={activePO?.items?.flatMap(i => i.serials) || []}
            priceLock={true}
        />
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MobileProvider>
        <HomeScreen />
      </MobileProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F1F5F9' },
  container: { padding: 32 },
  decor: { position: 'absolute', top: 0, left: 0, right: 0, height: 350, backgroundColor: '#0F172A', borderBottomRightRadius: 80, opacity: 0.05 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
  h1: { fontSize: 32, fontWeight: '900', color: '#1E293B', letterSpacing: -1 },
  h2: { fontSize: 13, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 },
  logout: { padding: 12, backgroundColor: '#FFF', borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.05, shadowRadius: 10 },
  card: { padding: 24, backgroundColor: '#FFF', borderRadius: 32, marginBottom: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.1, shadowRadius: 40 },
  cardTitle: { fontSize: 11, fontWeight: '900', color: '#94A3B8', textTransform: 'uppercase', marginBottom: 16, letterSpacing: 2 },
  poSummary: { flexDirection: 'row', gap: 12, marginTop: 12 },
  tag: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#F1F5F9', borderRadius: 10, borderWeight: 1, borderColor: '#E2E8F0' },
  tagBlue: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#DBEAFE', borderRadius: 10, borderWeight: 1, borderColor: '#BFDBFE' },
  tagText: { fontSize: 10, fontWeight: '800', color: '#64748B' },
  tagTextBlue: { fontSize: 10, fontWeight: '800', color: '#1D4ED8' },
  grid: { flexDirection: 'row', gap: 24 },
  action: { flex: 1, padding: 32, backgroundColor: '#3B82F6', borderRadius: 32, alignItems: 'center', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
  actionGold: { flex: 1, padding: 32, backgroundColor: '#F59E0B', borderRadius: 32, alignItems: 'center', shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
  actionDisabled: { opacity: 0.3, backgroundColor: '#94A3B8', shadowOpacity: 0 },
  actionIcon: { width: 64, height: 64, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  actionIconGold: { width: 64, height: 64, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  actionLabel: { color: '#FFF', fontWeight: '900', fontSize: 18 },
  actionWarning: { color: '#FFF', fontSize: 10, fontWeight: '700', marginTop: 4, opacity: 0.8 },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 64, opacity: 0.5 },
  footerText: { fontSize: 11, fontWeight: '800', color: '#94A3B8' },
  finishBtn: { marginTop: 24, padding: 18, backgroundColor: '#0F172A', borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  finishBtnText: { color: '#FFF', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: 0.5 },
  countBadge: { backgroundColor: '#3B82F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  countText: { color: '#FFF', fontSize: 12, fontWeight: '900' }
});
