import { db } from '@infrastructure/database/database'
import migrations from '@infrastructure/database/migrations/migrations'
import '@presentation/app/globals.css'
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator'
import { Text, View } from 'react-native'

export default function AppLayout() {
  const { success, error } = useMigrations(db, migrations)

  if (error) {
    return (
      <View>
        <Text>Migration error: {error.message}</Text>
      </View>
    )
  }

  if (!success) {
    return (
      <View>
        <Text>Migration is in progress...</Text>
      </View>
    )
  }

  return (
    <View>
      <Text className='mt-10 ml-3'>
        Hello World
      </Text>
    </View>
  )
}
