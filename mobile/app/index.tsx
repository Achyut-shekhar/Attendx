import { View, ActivityIndicator, StyleSheet } from 'react-native';

export default function Index() {
  // This is just a mounting point while _layout.tsx handles redirection
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6C63FF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4F5F9',
  },
});
