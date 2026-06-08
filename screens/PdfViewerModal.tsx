import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, Text, SafeAreaView } from 'react-native';
import Pdf from 'react-native-pdf';
import { X } from 'lucide-react-native';

export default function PdfViewerModal({ visible, uri, onClose }: { visible: boolean; uri: string; onClose: () => void }) {
    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Document Preview</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <X size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
                <Pdf
                    source={{ uri, cache: true }}
                    style={styles.pdf}
                    onError={(error) => console.log('PDF Error:', error)}
                />
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0B132B' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15 },
    title: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    closeButton: { padding: 5 },
    pdf: { flex: 1, width: '100%' }
});