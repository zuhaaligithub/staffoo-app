import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import { ArrowLeft } from 'lucide-react-native';

export default function DeleteProfileVerification({
    navigation,
}: any) {
    const [user, setUser] = useState<any>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [answers, setAnswers] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        try {
            const storedUser = await AsyncStorage.getItem('user');
            const uid = await AsyncStorage.getItem('@user_id');

            if (storedUser) {
                setUser(JSON.parse(storedUser));
            }

            setUserId(uid);
        } catch (error) {
            console.log(error);
        }
    };

  const deleteQuestions = [
    {
        question:
            'Type your registered full name exactly as shown on your profile',
        answer: user?.name || '',
    },
    {
        question: 'Type the last 4 digits of your registered phone number',
        answer: user?.phone ? user.phone.toString().slice(-4) : '',
    },
    {
        question: 'Type your registered email address',
        answer: user?.email || '',
    },
    {
        question: 'Type your username exactly as shown in your account',
        answer: user?.username || '',
    },
    {
        question: 'Type DELETE in capital letters',
        answer: 'DELETE',
    },
    {
        question: 'Type: I UNDERSTAND THIS ACTION CANNOT BE UNDONE',
        answer: 'I UNDERSTAND THIS ACTION CANNOT BE UNDONE',
    },
    {
        question: `To confirm, type: DELETE ${user?.name?.toUpperCase() || ''} PROFILE`,
        answer: `DELETE ${user?.name?.toUpperCase() || ''} PROFILE`,
    },
    {
        question: 'Type the current year',
        answer: new Date().getFullYear().toString(),
    },
    {
        question: 'Type PERMANENTLY DELETE ACCOUNT',
        answer: 'PERMANENTLY DELETE ACCOUNT',
    },
    {
        question: 'Type CONFIRM ACCOUNT DELETION to finalize this action',
        answer: 'CONFIRM ACCOUNT DELETION',
    },
];

    useEffect(() => {
        setAnswers(Array(deleteQuestions.length).fill(''));
    }, [user]);

    const verifyAnswers = () => {
        for (let i = 0; i < deleteQuestions.length; i++) {
            const expected = deleteQuestions[i].answer.trim();
            const entered = answers[i]?.trim();

            if (entered !== expected) {
                Alert.alert(
                    'Incorrect Answer',
                    `Question ${i + 1} answer is incorrect.`,
                );
                return false;
            }
        }

        return true;
    };

    const deleteProfile = async () => {
        try {
            setLoading(true);

            const token = await AsyncStorage.getItem('@auth_token');

            if (!token || !userId) {
                Toast.show({
                    type: 'error',
                    text1: 'Authentication failed',
                });
                return;
            }

            const response = await fetch(
                `https://apis.staffoo.com.au/api/user-delete/${userId}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                },
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                Toast.show({
                    type: 'error',
                    text1: 'Delete Failed',
                    text2: data?.message || 'Something went wrong',
                });
                return;
            }

            await AsyncStorage.multiRemove([
                '@user_id',
                '@auth_token',
                'user',
                'profileImage',
            ]);

            Toast.show({
                type: 'success',
                text1: 'Profile deleted successfully',
            });

            navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
            });
        } catch (error: any) {
            Toast.show({
                type: 'error',
                text1: 'Delete Failed',
                text2: error?.message || 'Unknown error',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = () => {
        if (!verifyAnswers()) {
            return;
        }

        Alert.alert(
            'Final Warning',
            'Your profile will be permanently deleted and cannot be recovered.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete Forever',
                    style: 'destructive',
                    onPress: deleteProfile,
                },
            ],
        );
    };

    if (!user) {
        return (
            <View style={styles.center}>
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 50 }}
        >

            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <ArrowLeft size={24} color="#000" />
                    {/* OR */}
                    {/* <Ionicons name="arrow-back" size={24} color="#000" /> */}
                </TouchableOpacity>

                <Text style={styles.headerTitle}>
                    Delete Profile
                </Text>

                <View style={{ width: 24 }} />
            </View>

            <Text style={styles.warning}>
                Complete all questions correctly before your
                profile can be deleted.
            </Text>

            {deleteQuestions.map((item, index) => (
                <View key={index} style={styles.questionContainer}>
                    <Text style={styles.question}>
                        {index + 1}. {item.question}
                    </Text>

                    <TextInput
                        value={answers[index]}
                        onChangeText={text => {
                            const updated = [...answers];
                            updated[index] = text;
                            setAnswers(updated);
                        }}
                        placeholder="Enter answer"
                        style={styles.input}
                    />
                </View>
            ))}

            <TouchableOpacity
                disabled={loading}
                style={styles.deleteButton}
                onPress={handleSubmit}
            >
                <Text style={styles.deleteButtonText}>
                    {loading
                        ? 'Deleting...'
                        : 'Verify & Delete Profile'}
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#fff',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    heading: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 10,
    },
    warning: {
        color: 'red',
        marginBottom: 25,
        fontSize: 15,
    },
    questionContainer: {
        marginBottom: 20,
    },
    question: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#DADADA',
        borderRadius: 10,
        paddingHorizontal: 15,
        paddingVertical: 12,
    },
    deleteButton: {
        backgroundColor: '#DC2626',
        paddingVertical: 15,
        borderRadius: 12,
        marginTop: 20,
    },
    deleteButtonText: {
        color: '#fff',
        textAlign: 'center',
        fontWeight: '700',
        fontSize: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 25,
    },

    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
    },

    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111',
    },
});