import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ShieldAlert, Video, ExternalLink, Info } from 'lucide-react-native';

export default function PermissionGuard({ permission, requestPermission, children }) {
  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Initializing Vision Hub...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
            <View style={styles.brandIcon}>
                <Video size={32} color="#FFF" />
            </View>
            <Text style={styles.brandTitle}>Ethan Home Appliances</Text>
            <Text style={styles.brandTag}>Enterprise Operations Hub</Text>
        </View>

        <View style={styles.card}>
            <ShieldAlert size={48} color="#EF4444" style={styles.cardIcon} />
            <Text style={styles.cardTitle}>Camera Access Required</Text>
            <Text style={styles.cardInfo}>
              To scan barcodes and process Goods Receipt Notes (GRN), this app needs access to your device camera.
            </Text>

            <View style={styles.bulletBox}>
                <View style={styles.bullet}>
                    <Info size={14} color="#64748B" />
                    <Text style={styles.bulletText}>Used only for barcode scanning</Text>
                </View>
                <View style={styles.bullet}>
                    <Info size={14} color="#64748B" />
                    <Text style={styles.bulletText}>No photos are saved to your gallery</Text>
                </View>
            </View>

            <TouchableOpacity style={styles.btn} onPress={requestPermission}>
                <Text style={styles.btnText}>Grant Camera Access</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.link}>
                <Text style={styles.linkText}>View Privacy Policy</Text>
                <ExternalLink size={12} color="#94A3B8" />
            </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Region: Karachi Operations v1.0.4</Text>
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC', padding: 32, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', gap: 16 },
  loadingText: { color: '#64748B', fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2 },
  header: { alignItems: 'center', marginBottom: 48 },
  brandIcon: { width: 80, height: 80, backgroundColor: '#0F172A', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20 },
  brandTitle: { fontSize: 24, fontWeight: '900', color: '#1E293B' },
  brandTag: { fontSize: 13, fontWeight: '700', color: '#64748B', textTransform: 'uppercase', letterSpacing: 1 },
  card: { backgroundColor: '#FFF', padding: 32, borderRadius: 40, width: '100%', maxWidth: 450, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.08, shadowRadius: 40 },
  cardIcon: { marginBottom: 24 },
  cardTitle: { fontSize: 20, fontWeight: '900', color: '#0F172A', marginBottom: 12 },
  cardInfo: { color: '#64748B', textAlign: 'center', lineHeight: 22, fontWeight: '600', marginBottom: 32 },
  bulletBox: { width: '100%', gap: 8, marginBottom: 32, padding: 16, backgroundColor: '#F1F5F9', borderRadius: 20 },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bulletText: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  btn: { width: '100%', padding: 20, backgroundColor: '#3B82F6', borderRadius: 20, alignItems: 'center', shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20 },
  btnText: { color: '#FFF', fontWeight: '900', fontSize: 16 },
  link: { marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.5 },
  linkText: { color: '#64748B', fontSize: 12, fontWeight: '800' },
  footer: { position: 'absolute', bottom: 40, color: '#94A3B8', fontSize: 11, fontWeight: '800' }
});
