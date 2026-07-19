import React, { useRef } from 'react';
import { StyleSheet, Pressable, Animated, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

interface CustomCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  sublabel?: string;
  color?: string;
}

export const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  label,
  checked,
  onChange,
  sublabel,
  color = '#4F46E5', // default premium Indigo
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 50,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    onChange(!checked);
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.container}
    >
      <Animated.View style={[styles.checkboxRow, { transform: [{ scale: scaleAnim }] }]}>
        <View
          style={[
            styles.checkbox,
            checked ? { backgroundColor: color, borderColor: color } : styles.unchecked,
          ]}
        >
          {checked && (
            <MaterialCommunityIcons name="check" size={14} color="#FFFFFF" />
          )}
        </View>
        <View style={styles.textContainer}>
          <Text numberOfLines={1} style={[styles.label, checked && styles.checkedLabel]}>
            {label}
          </Text>
          {sublabel && (
            <Text numberOfLines={1} style={styles.sublabel}>
              {sublabel}
            </Text>
          )}
        </View>
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    width: '48%', // Grid layout helper
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2330', // Deep card background
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#2A3142',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3.84,
    elevation: 3,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unchecked: {
    borderColor: '#4A5568',
    backgroundColor: '#131A26',
  },
  textContainer: {
    marginLeft: 10,
    flex: 1,
  },
  label: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  checkedLabel: {
    color: '#F8FAFC',
    fontWeight: '700',
  },
  sublabel: {
    color: '#64748B',
    fontSize: 10,
    marginTop: 1,
  },
});
export default CustomCheckbox;
