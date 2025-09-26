// src/components/AutocompleteInput.tsx
import React, { useEffect, useState } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useDebounce } from '../hooks/useDebounce';
import type { Suggestion } from '../services/places';

type Props = {
  placeholder?: string;
  value: string;
  onChangeText: (t: string) => void;
  fetcher: (q: string) => Promise<Suggestion[]>;
  minChars?: number;
};

export default function AutocompleteInput({
  placeholder,
  value,
  onChangeText,
  fetcher,
  minChars = 2,
}: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const debounced = useDebounce(value, 250);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if ((debounced || '').trim().length < minChars) {
        setItems([]);
        setOpen(false);
        return;
      }
      const res = await fetcher(debounced.trim());
      if (!cancelled) {
        setItems(res);
        setOpen(res.length > 0);
      }
    })();
    return () => { cancelled = true; };
  }, [debounced]);

  const select = (s: Suggestion) => {
    onChangeText(s.label);
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        value={value}
        onChangeText={(t) => { onChangeText(t); setOpen(true); }}
        placeholder={placeholder}
        style={styles.input}
        autoCorrect={false}
      />
      {open && items.length > 0 && (
        <View style={styles.panel}>
          <FlatList
            keyboardShouldPersistTaps="handled"
            data={items}
            keyExtractor={(it, idx) => String(it.id ?? idx)}
            renderItem={({ item }) => (
              <TouchableOpacity onPress={() => select(item)} style={styles.item}>
                <Text>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'relative' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 12, borderRadius: 6 },
  panel: {
    position: 'absolute',
    top: 48,
    left: 0,
    right: 0,
    maxHeight: 220,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    zIndex: 20,
  },
  item: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
});
