import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, FlatList } from 'react-native';
import { Search, ChevronDown, PackageCheck } from 'lucide-react-native';
import { fetchLightweightPOs } from '../utils/supabase';

export default function SearchableCombobox({ onSelect }) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [realPOs, setRealPOs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Phase 3: Bind to database bridge (DB-ARCHITECT)
  React.useEffect(() => {
    fetchLightweightPOs().then(data => {
      if (data) setRealPOs(data);
      setIsLoading(false);
    });
  }, []);

  // Memoized local filtering for zero lag on iPad
  const filteredPO = useMemo(() => {
    const list = realPOs.length > 0 ? realPOs : [];
    if (!query) return list;
    const lower = query.toLowerCase();
    return list.filter(po => 
      po.id.toLowerCase().includes(lower) || 
      po.vendor.toLowerCase().includes(lower)
    );
  }, [query, realPOs]);

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
            ListEmptyComponent={() => (
              <View style={styles.empty}>
                 <Text style={styles.emptyText}>{isLoading ? 'Initialising Bridge...' : 'No Match Found'}</Text>
              </View>
            )}
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
