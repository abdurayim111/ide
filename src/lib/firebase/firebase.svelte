<script lang="ts" module>
	import { initializeApp } from 'firebase/app';
	import { getAnalytics } from 'firebase/analytics';
	import { connectDatabaseEmulator, getDatabase } from 'firebase/database';
	import {
		connectAuthEmulator,
		getAuth,
		GoogleAuthProvider,
		linkWithPopup,
		signInAnonymously,
		signInWithCredential,
		signInWithPopup,
		updateProfile,
		type User
	} from 'firebase/auth';
	import animals from './animals';
	import { getContext, onMount } from 'svelte';
	import { PUBLIC_USE_FIREBASE_EMULATORS } from '$env/static/public';
	import { type UserData } from '$lib/types';
	import { browser } from '$app/environment';

	// 🔥 НОВЫЕ ДАННЫЕ FIREBASE (проект ide-main)
	let firebaseConfig = {
		apiKey: "AIzaSyBkfu9G15osOlbhG3gqEiW7xFzL6CKUc40",
		authDomain: "ide-main.firebaseapp.com",
		databaseURL: "https://ide-main-default-rtdb.firebaseio.com",
		projectId: "ide-main",
		storageBucket: "ide-main.firebasestorage.app",
		messagingSenderId: "906100767192",
		appId: "1:906100767192:web:22c430119b9a6c2f3c1aad",
		measurementId: "G-RVP76Y9X6R"
	};

	if (PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
		firebaseConfig = {
			...firebaseConfig,
			authDomain: 'localhost:9099',
			databaseURL: 'http://localhost:9000/?ns=ide-main-default-rtdb'
		};
	}

	export const app = initializeApp(firebaseConfig);
	export const auth = getAuth(app);
	
	// Analytics и Database инициализируем только в браузере (для SSR совместимости)
	export let analytics: ReturnType<typeof getAnalytics> | null = null;
	export let database: ReturnType<typeof getDatabase> | null = null;
	
	if (browser) {
		analytics = getAnalytics(app);
		database = getDatabase(app);
		
		if (PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
			connectAuthEmulator(auth, 'http://127.0.0.1:9099');
			if (database) {
				connectDatabaseEmulator(database, 'localhost', 9000);
			}
		}
	}

	export let authState: {
		firebaseUser: User | null;
	} = $state({
		firebaseUser: null
	});

	/**
	 * Opens a popup to sign in with Google.
	 */
	export const signInWithGoogle = (confirmDataOverride: () => Promise<boolean>) => {
		if (!authState.firebaseUser) {
			throw new Error(
				'Firebase user is null. Make sure authState.isLoading() is false before calling signInWithGoogle().'
			);
		}

		const provider = new GoogleAuthProvider();

		if (PUBLIC_USE_FIREBASE_EMULATORS === 'true') {
			signInWithPopup(auth, provider);
		} else {
			linkWithPopup(authState.firebaseUser, provider)
				.then((result) => {
					const newName = result.user.providerData[0].displayName;
					if (newName) updateProfile(result.user, { displayName: newName });
				})
				.catch((error) => {
					if (error.code === 'auth/credential-already-in-use') {
						confirmDataOverride().then((override) => {
							if (override) {
								const credential = GoogleAuthProvider.credentialFromError(error);
								if (!credential) {
									throw new Error('No credential found in error');
								}
								signInWithCredential(auth, credential);
							}
						});
					} else {
						throw error;
					}
				});
		}
	};

	/**
	 * Signs out the current user.
	 */
	export const signOut = () => {
		return auth.signOut();
	};

	const USER_DATA_KEY = Symbol('userData');
	export const getUserData: () => UserData = () => getContext(USER_DATA_KEY);
</script>

<script lang="ts">
	import { setContext } from 'svelte';
	import { onValue, ref } from 'firebase/database';
	
	const defaultData = {
		editorMode: 'normal',
		tabSize: 4,
		theme: localStorage.theme ?? 'dark',
		defaultPermission: 'READ_WRITE',
		defaultLanguage: 'cpp',
		inlayHints: 'off',
		showHiddenFiles: 'no'
	} as UserData;
	
	let userData: UserData = $state(defaultData);
	
	setContext(USER_DATA_KEY, userData);
	
	onMount(() => {
		let unsubscribeUserData: () => void = () => {};
		const unsubscribeAuth = auth.onAuthStateChanged((user) => {
			unsubscribeUserData();
			unsubscribeUserData = () => {};
			
			if (!user) {
				authState.firebaseUser = null;
				for (const key in defaultData) userData[key] = defaultData[key];
				signInAnonymously(auth).catch((error) => {
					const errorCode = error.code;
					const errorMessage = error.message;
					alert('Error signing in: ' + errorCode + ' ' + errorMessage);
				});
			} else {
				let displayName = user.displayName;
				if (!displayName) {
					displayName = 'Anonymous ' + animals[Math.floor(animals.length * Math.random())];
					updateProfile(user, { displayName })
						.catch((error) => {
							const errorCode = error.code;
							const errorMessage = error.message;
							alert('Error updating profile: ' + errorCode + ' ' + errorMessage);
						})
						.then(() => {
							authState.firebaseUser = user;
						});
				} else {
					authState.firebaseUser = user;
				}

				// Проверяем что database существует (не на сервере)
				if (database) {
					const userDataRef = ref(database, `users/${user.uid}/data`);
					unsubscribeUserData = onValue(userDataRef, (snapshot) => {
						const data = snapshot.val();
						if (data) {
							if (data.editorMode === 'vim' || data.editorMode === 'normal') {
								userData.editorMode = data.editorMode;
							}
							if (data.tabSize === 2 || data.tabSize === 4 || data.tabSize === 8) {
								userData.tabSize = data.tabSize;
							}
							if (data.theme === 'light' || data.theme === 'dark' || data.theme === 'huacat-pink') {
								localStorage.theme = userData.theme = data.theme;
							}
							if (data.inlayHints === 'on' || data.inlayHints === 'off') {
								userData.inlayHints = data.inlayHints;
							}
							if (
								data.defaultPermission === 'READ_WRITE' ||
								data.defaultPermission === 'READ' ||
								data.defaultPermission === 'PRIVATE'
							) {
								userData.defaultPermission = data.defaultPermission;
							}
							if (
								data.defaultLanguage === 'cpp' ||
								data.defaultLanguage === 'java' ||
								data.defaultLanguage === 'py'
							) {
								userData.defaultLanguage = data.defaultLanguage;
							}
							if (data.showHiddenFiles === 'yes' || data.showHiddenFiles === 'no') {
								userData.showHiddenFiles = data.showHiddenFiles;
							}
						}
					});
				}
			}
		});

		return () => {
			unsubscribeUserData();
			unsubscribeAuth();
		};
	});
	
	$effect(() => {
		document.documentElement.setAttribute('data-theme', userData.theme);
	});
	
	const { children } = $props();
</script>

{@render children()}