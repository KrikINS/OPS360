import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { Search, ChevronDown, PackageCheck } from 'lucide-react-native';

// Mock data (Phase 2 will replace with real query)
const MOCK_POS = [
  { id: 'PO-2026-0001', vendor: 'Global Tech', total: 15400, items: [{ sku: 'SAM-S24', serials: ['123', '456'], price: 900 }] },
  { id: 'PO-2026-0014', vendor: 'Warehouse Co', total: 8000, items: [] }
];

export default function SearchableCombobox({ onSelect }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Memoized local filtering for zero lag on iPad
  const filteredPO = useMemo(() => {
    if (!query) return MOCK_POS;
    const lower = query.toLowerCase();
    return MOCK_POS.filter(po => 
      po.id.toLowerCase().includes(lower) || 
      po.vendor.toLowerCase().includes(lower)
    );
  }, [query]);

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Search size={18} color="#94A3B8" style={styles.icon} />
        <TextInput
          placeholder="Search Purchase Order # or Vendor..."
          placeholderTextColor="#64748B"
          value={query}
          onChangeText={setQuery}
          onFocus={() => setIsOpen(true)}
          style={styles.input}
        />
        <TouchableOpacity onPress={() => setIsOpen(!isOpen)}>
           <ChevronDown size={20} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {isOpen && (
        <View style={styles.dropdown}>
          <FlatList
            data={filteredPO}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.item} 
                onPress={() => {
                  onSelect(item);
                  setQuery(item.id);
                  setIsOpen(false);
                }}
              >
                <View>
                  <Text style={styles.poId}>{item.id}</Text>
                  <Text style={styles.vendorName}>{item.vendor}</Text>
                </View>
                <PackageCheck size={16} color="#3B82F6" />
              </TouchableOpacity>
            )}
            style={styles.list}
            scrollEnabled={true}
            keyboardShouldPersistTaps="always"
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { zIndex: 100, marginBottom: 20 },
  searchBar: { 
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, 
    paddingHorizontal: 16, borderWeight: 1, borderColor: '#E2E8F0', height: 56,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10
  },
  icon: { marginRight: 12 },
  input: { flex: 1, color: '#1E293B', fontWeight: '800', fontSize: 16 },
  dropdown: { 
    position: 'absolute', top: 64, left: 0, right: 0, 
    backgroundColor: '#FFF', borderRadius: 20, maxHeight: 300, 
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.1, shadowRadius: 30,
    elevation: 10, overflow: 'hidden'
  },
  list: { padding: 8 },
  item: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
    padding: 16, borderRadius: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' 
  },
  poId: { color: '#0F172A', fontWeight: '900', fontSize: 16 },
  vendorName: { color: '#64748B', fontSize: 12, fontWeight: '700' }
});
