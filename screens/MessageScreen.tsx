import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Dimensions,
} from 'react-native';
import {
    ChevronLeft,
    Search,
    MoreVertical,
    Home,
    FileText,
    Plus,
    MessageCircle,
    User,
} from 'lucide-react-native';
import { CheckCheck } from 'lucide-react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
// import { BlurView } from '@react-native-community/blur';
import { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import BottomTab from './BottomTab';
import AsyncStorage from '@react-native-async-storage/async-storage';



const chats = [
    {
        id: '1',
        name: 'Floyd Miles',
        avatar: require('../assets/avt-2.jpg'),
        lastMessage: 'Great I will have a look the te...',
        time: 'Just Now',
        unread: 2,
        online: true,
    },
    {
        id: '2',
        name: 'Floyd Miles',
        avatar: require('../assets/avt-3.jpg'),
        lastMessage: 'Thank you. Have a nice day',
        time: '10 min ago',
        seen: true,
    },
    {
        id: '3',
        name: 'Floyd Miles',
        avatar: require('../assets/avt-4.jpg'),
        lastMessage: 'Sent a voice message',
        time: '10 min ago',
        online: true,
        seen: false,
        isVoice: true,
    },
    {
        id: '4',
        name: 'Floyd Miles',
        avatar: require('../assets/avt-5.jpg'),
        lastMessage: 'It looks like very beautiful',
        time: '1 hr ago',
        unread: 4,
    },
    {
        id: '5',
        name: 'Floyd Miles',
        avatar: require('../assets/avt-6.jpg'),
        lastMessage: 'Great. Nice to meet you!',
        time: '3 hr ago',
        seen: true,
    },
    {
        id: '6',
        name: 'Floyd Miles',
        avatar: require('../assets/avt-7.jpg'),
        lastMessage: 'Awesome idea. I love it. 😍',
        time: '8h ago',
        seen: true,
        hasEmoji: true,
    },
    {
        id: '7',
        name: 'Floyd Miles',
        avatar: require('../assets/avt-8.jpg'),
        lastMessage: 'Awesome idea. I love it. 😍',
        time: '8h ago',
        seen: true,
        hasEmoji: true,
    },
    {
        id: '8',
        name: 'Floyd Miles',
        avatar: require('../assets/avt-2.jpg'),
        lastMessage: 'Great I will have a look the te...',
        time: 'Just Now',
        unread: 2,
        online: true,
    },
    {
        id: '9',
        name: 'Floyd Miles',
        avatar: require('../assets/avt-3.jpg'),
        lastMessage: 'Thank you. Have a nice day',
        time: '10 min ago',
        seen: true,
    },
];

type Props = { navigation: any };

export default function MessageScreen({ navigation }: Props) {
// const [isActive, setIsActive] = useState(false);
    const [user, setUser] = useState<any>(null);
  const [userType, setUserType] = useState<string | null>(null);
    // Load user (example: from API or props)
    React.useEffect(() => {
        // Replace this with your real logged-in user
        const loggedInUser = {
            user_type: "staff",
        };
        setUser(loggedInUser);
    }, []);
    const bottomSheetRef = useRef<BottomSheet>(null);

    const snapPoints = ['65%', '70%'];

    const openAttachments = () => {
        bottomSheetRef.current?.expand();
    };

    const closeSheet = () => {
        bottomSheetRef.current?.close();
    };

    const renderBackdrop = (props: any) => (
        <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={0.4}
            pressBehavior="close"
        >

        </BottomSheetBackdrop>
    );


    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBox} onPress={() => navigation.goBack()}>
                    <ChevronLeft size={26} color="#000" strokeWidth={2.5} />
                </TouchableOpacity>

                <Text style={styles.headerTitle}>Message</Text>

                <View style={styles.headerRight}>
                    <TouchableOpacity>
                        <Search size={24} color="#000" strokeWidth={2} />
                    </TouchableOpacity>
                    <TouchableOpacity style={{ marginLeft: 20 }} onPress={openAttachments}>
                        <MoreVertical size={24} color="#000" strokeWidth={2.5} />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView style={styles.scrollView}>
                <View style={styles.chatList}>
                    {chats.map((chat) => (
                        <TouchableOpacity
                            key={chat.id}
                            style={styles.chatItem}
                            activeOpacity={0.75}
                            onPress={() => navigation.navigate('MessageDetail', { chatId: chat.id })}
                        >
                            <View style={styles.avatarContainer}>
                                <Image source={chat.avatar} style={styles.avatar} />
                                {chat.online && <View style={styles.onlineDot} />}
                            </View>

                            <View style={styles.chatInfo}>
                                <Text style={styles.chatName}>{chat.name}</Text>
                                <Text style={styles.lastMessage} numberOfLines={1} ellipsizeMode="tail">
                                    {chat.isVoice ? 'Sent a voice message' : chat.lastMessage}
                                </Text>
                            </View>

                            <View style={styles.rightColumn}>
                                <Text style={styles.timeText}>{chat.time}</Text>

                                {chat.unread ? (
                                    <View style={styles.unreadBadge}>
                                        <Text style={styles.unreadCount}>{chat.unread}</Text>
                                    </View>
                                ) : chat.seen ? (
                                    <View style={styles.seenTick}>
                                        <CheckCheck size={16} color="#6366F1" strokeWidth={2.5} />
                                    </View>
                                ) : null}
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>


            <BottomTab navigation={navigation} activeTab="Messages" />
            {/* Attachments Bottom Sheet */}
            <BottomSheet
                ref={bottomSheetRef}
                index={-1}
                snapPoints={snapPoints}
                enablePanDownToClose
                backdropComponent={renderBackdrop}
                backgroundStyle={styles.sheetBackground}
                handleIndicatorStyle={styles.handleIndicator}
            >
                <BottomSheetView style={styles.sheetContent}>
                    {/* Header */}
                    <View style={styles.sheetHeader}>
                        <Text style={styles.sheetTitle}>Attachments</Text>
                        <TouchableOpacity onPress={closeSheet} style={styles.closeButton}>
                            <Text style={styles.closeText}>×</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Latest Photos */}
                    <Text style={styles.sectionTitle}>LATEST PHOTOS</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosContainer}>
                        <Image source={require('../assets/blog1.jpg')} style={styles.photoThumb} />
                        <Image source={require('../assets/blog2.jpg')} style={styles.photoThumb} />
                        <Image source={require('../assets/blog3.jpg')} style={styles.photoThumb} />
                    </ScrollView>

                    {/* Other Files */}
                    <Text style={[styles.sectionTitle, { marginTop: 28 }]}>OTHER FILES</Text>
                    <View style={styles.filesList}>
                        <View style={styles.fileItem}>
                            <View style={[styles.fileIconContainer, { backgroundColor: '#DBEAFE' }]}>
                                <Text style={styles.fileIcon}>↓</Text>
                            </View>
                            <View style={styles.fileText}>
                                <Text style={styles.fileName}>Project Brief v1.docx</Text>
                                <Text style={styles.fileSize}>132.5 KB</Text>
                            </View>
                        </View>

                        <View style={styles.fileItem}>
                            <View style={[styles.fileIconContainer, { backgroundColor: '#E0F2FE' }]}>
                                <Text style={styles.fileIcon}>📊</Text>
                            </View>
                            <View style={styles.fileText}>
                                <Text style={styles.fileName}>32 Excel Sheets</Text>
                                <Text style={styles.fileSize}>12.5 MB</Text>
                            </View>
                        </View>

                        <View style={styles.fileItem}>
                            <View style={[styles.fileIconContainer, { backgroundColor: '#F3E8FF' }]}>
                                <Text style={styles.fileIcon}>📄</Text>
                            </View>
                            <View style={styles.fileText}>
                                <Text style={styles.fileName}>60 PDF presentations</Text>
                                <Text style={styles.fileSize}>28.5 MB</Text>
                            </View>
                        </View>

                        <View style={styles.fileItem}>
                            <View style={[styles.fileIconContainer, { backgroundColor: '#FEF3C7' }]}>
                                <Text style={styles.fileIcon}>🎥</Text>
                            </View>
                            <View style={styles.fileText}>
                                <Text style={styles.fileName}>Explanation Video.mp4</Text>
                                <Text style={styles.fileSize}>80 MB</Text>
                            </View>
                        </View>
                    </View>
                </BottomSheetView>
            </BottomSheet>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    // ─── Main Container ────────────────────────────────────────────────────────
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        paddingTop: 20,
    },

    // ─── Header ────────────────────────────────────────────────────────────────
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
        // backgroundColor: '#FFFFFF',
        // borderBottomWidth: 1,
        // borderBottomColor: '#F1F5F9',
    },
    backBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 7,
        // subtle shadow for "box" feel
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 24,
    },

    // ─── Scroll & Chat List ────────────────────────────────────────────────────
    scrollView: {
        flex: 1,
    },
    chatList: {
        paddingTop: 25,
        paddingHorizontal: 16,
        paddingBottom: 100, // space for bottom tab
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        marginBottom: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 54,
        height: 54,
        borderRadius: 27,
    },
    fileText: {

    },
    onlineDot: {
        position: 'absolute',
        bottom: 3,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#22C55E',
        borderWidth: 3,
        borderColor: '#FFFFFF',
    },
    chatInfo: {
        flex: 1,
        marginLeft: 14,
    },
    chatName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 3,
    },
    lastMessage: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 18,
    },
    rightColumn: {
        alignItems: 'flex-end',
        minWidth: 70,
    },
    timeText: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 6,
    },
    unreadBadge: {
        backgroundColor: '#3B82F6',
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    unreadCount: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    seenTick: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#EEF2FF',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // ─── Bottom Tab ────────────────────────────────────────────────────────────
    bottomTab: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingVertical: 12,
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    tabItem: {
        alignItems: 'center',
        padding: 8,
    },
    tabItemActive: {
        alignItems: 'center',
        padding: 8,
    },
    tabAdd: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#2869FE',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -40,
        shadowColor: '#2869FE',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 10,
    },

    // ─── Bottom Sheet ──────────────────────────────────────────────────────────
    sheetBackground: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 20,
    },
    handleIndicator: {
        backgroundColor: '#D1D5DB',
        width: 48,
        height: 5,
        borderRadius: 3,
    },
    backdropBlur: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.45)', // blur-like overlay
    },
    sheetContent: {
        flex: 1,
        paddingHorizontal: 24,
        // paddingTop: 20,
    },
    sheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,

    },
    sheetTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#111827',
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeText: {
        fontSize: 24,
        color: '#374151',
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    photosContainer: {
        marginBottom: 0,
    },
    photoThumb: {
        width: 90,
        height: 90,
        borderRadius: 16,
        marginRight: 16,
    },
    filesList: {
        gap: 10,
    },
    fileItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    fileIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    fileIcon: {
        fontSize: 24,
    },
    fileInfo: {
        flex: 1,
    },
    fileName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#111827',
    },
    fileSize: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
});