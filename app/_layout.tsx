import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7',
        },
        headerTintColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      }}
    >
      {/* This is the Login page. It's the default and has no header. */}
      <Stack.Screen
        name="index"
        options={{ headerShown: false }} 
      />
      
      {/* This is the main app (tabs). It will also hide its header. */}
      <Stack.Screen 
        name="(tabs)" 
        options={{ headerShown: false }}
      />

      {/* These are other pages that can be opened from anywhere */}
      <Stack.Screen name="register" options={{ title: 'Register' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="edit-profile" options={{ title: 'Edit Profile' }} />
      <Stack.Screen name="delete-account" options={{ title: 'Delete Account' }} />
    </Stack>
  );
}
