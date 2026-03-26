import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
     ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/types'; // adjust path

import {
  ChevronLeft,
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
  
} from 'lucide-react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
// import { BlurView } from '@react-native-community/blur';
import { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
type MessageDetailRouteProp = RouteProp<RootStackParamList, 'MessageDetail'>;

type Message = {
  id: string;
  text: string;
  isMe: boolean;
  time: string;
};

const initialMessages: Message[] = [
  // oldest → top
  { id: '3', text: 'hooh kie selak kaliren weteng inyong...', isMe: false, time: '08:01 AM' },
  { id: '7', text: 'peeh ra modal koen cuk', isMe: false, time: '08:01 AM' },
  { id: '1', text: 'Halo, bro', isMe: true, time: '08:50 AM' },
  { id: '2', text: 'kepriwe kie rawone ra mudun-mudun', isMe: true, time: '08:50 AM' },
  { id: '4', text: 'opo tak tuku bae', isMe: true, time: '08:50 AM' },
  { id: '5', text: 'karuane inyong metu nyang pasar bae', isMe: true, time: '08:50 AM' },
  { id: '6', text: 'Njaluk duwite yoo', isMe: true, time: '08:50 AM' },
];

export default function MessageDetailScreen() {
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
  const navigation = useNavigation();
  const route = useRoute<MessageDetailRouteProp>();

  // Safely destructure with default values
  const { name = 'Ronald Rich' } = route.params ?? {};

  const [messages] = useState<Message[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: false });
    }, 100);
  }, []);

  const handleSend = () => {
    if (!inputText.trim()) return;
    setInputText('');
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => (
    <>
      {index === 0 && (
        <View style={styles.dateHeader}>
          <View style={styles.dateLine} />
          <Text style={styles.dateLabel}>Today</Text>
          <View style={styles.dateLine} />
        </View>
      )}

      <View
        style={[
          styles.messageRow,
          item.isMe ? styles.messageRowRight : styles.messageRowLeft,
        ]}
      >
        <Text
          style={[
            styles.timeText,
            item.isMe ? styles.timeRight : styles.timeLeft,
          ]}
        >
          {item.time}
        </Text>

        <View
          style={[
            styles.bubble,
            item.isMe ? styles.bubbleMe : styles.bubbleOther,
          ]}
        >
          <Text style={styles.messageText}>{item.text}</Text>
        </View>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ChevronLeft size={28} color="#000" strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.profileContainer}>
          <View style={styles.avatarContainer}>
            <Image
              source={require('../assets/avt-9.png')}
              style={styles.avatar}
            />
            <View style={styles.onlineDot} />
          </View>

          <View style={styles.nameContainer}>
            <Text style={styles.contactName}>{name}</Text>
            <Text style={styles.onlineText}>Online</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn}>
            <Phone size={22} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Video size={22} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={openAttachments}>
            <MoreVertical size={22} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages + Input */}
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.inputBtn} onPress={openAttachments}>
            <Paperclip size={24} color="#64748b" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.inputBtn}>
            <Smile size={24} color="#64748b" />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            placeholder="Type message..."
            placeholderTextColor="#94a3b8"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />

          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Send size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

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
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
    // paddingTop:20,
  },
  keyboardAvoid: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 25,
    backgroundColor: '#ffffff',
    // borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    padding: 8,
  },
  profileContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22c55e',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  nameContainer: {
    marginLeft: 12,
  },
  contactName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#0f172a',
  },
  onlineText: {
    fontSize: 13,
    color: '#64748b',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionBtn: {
    padding: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 80, // space for input bar
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#cbd5e1',
  },
  dateLabel: {
    paddingHorizontal: 16,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  messageRow: {
    marginVertical: 6,
    maxWidth: '80%',
  },
  messageRowLeft: {
    alignSelf: 'flex-start',
  },
  messageRowRight: {
    alignSelf: 'flex-end',
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  bubbleMe: {
    backgroundColor: '#a78bfa', // purple – sender
    borderBottomRightRadius: 6,
  },
  bubbleOther: {
    backgroundColor: '#e2e8f0', // gray – receiver
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontSize: 15.5,
    lineHeight: 21,
    color: '#0f172a',
  },
  timeText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    marginHorizontal: 8,
  },
  timeLeft: {
    alignSelf: 'flex-start',
  },
  timeRight: {
    alignSelf: 'flex-end',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 28 : 12,
  },
  inputBtn: {
    padding: 10,
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#f1f5f9',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 8,
    fontSize: 16,
    color: '#0f172a',
  },
  sendBtn: {
    backgroundColor: '#6366f1',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
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
       fileText: {

    },
});
