/**
 * @format
 */

import { AppRegistry } from 'react-native';
import notifee, { EventType } from '@notifee/react-native';
import BackgroundFetch from 'react-native-background-fetch';
import App from './App';
import { name as appName } from './app.json';
import MessageTriggerEngine from './src/engines/MessageTriggerEngine';

// Handle background notification clicks (e.g., when the app is completely closed)
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.DELIVERED) {
    await MessageTriggerEngine.handleDeliveredPrefetchNotification(detail.notification);
  }
});

// Configure Headless JS Task for BackgroundFetch
// This hits the OS's JobScheduler/WorkManager to periodically wake up our JS to prefetch more messages if we run dry
const HeadlessTask = async (event) => {
  const taskId = event.taskId;
  console.log('[BackgroundFetch HeadlessTask] start: ', taskId);

  if (!MessageTriggerEngine.isForeground) {
    // If the background job actually fires, let's schedule another batch of messages
    await MessageTriggerEngine.scheduleOfflineMessages();
  }

  BackgroundFetch.finish(taskId);
};

// Register BackgroundFetch HeadlessTask for Android (when app is closed)
BackgroundFetch.registerHeadlessTask(HeadlessTask);

// Configure background fetch globally for period fetching
BackgroundFetch.configure({
  minimumFetchInterval: 60,     // <-- minutes (1 hour minimum)
  stopOnTerminate: false,       // <-- keep running if user closes app
  enableHeadless: true,         // <-- allow headless execution
  startOnBoot: true,            // <-- resume after device restart
  requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY, // <-- requires network
}, async (taskId) => {
  console.log('[BackgroundFetch] Active task:', taskId);
  
  if (!MessageTriggerEngine.isForeground) {
    await MessageTriggerEngine.scheduleOfflineMessages();
  }
  
  BackgroundFetch.finish(taskId);
}, (taskId) => {
  console.warn('[BackgroundFetch] TIMEOUT task: ', taskId);
  BackgroundFetch.finish(taskId);
});

AppRegistry.registerComponent(appName, () => App);
