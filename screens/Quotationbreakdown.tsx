import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Receipt } from 'lucide-react-native';

/**
 * QuotationBreakdown
 * ------------------------------------------------------------------
 * A drop-in "invoice style" breakdown card that mirrors the
 * Description / Rate Type / Billable Hours / Unit Price / Subtotal
 * layout, finishing with Subtotal (Ex GST), GST, Quote Total,
 * an optional discount line and a final "Amount Payable" row.
 *
 * FONTS
 * ------------------------------------------------------------------
 * To match the screenshot exactly, install + load these fonts once
 * in your app's root (App.tsx) using @expo-google-fonts:
 *
 *   npx expo install @expo-google-fonts/poppins @expo-google-fonts/jetbrains-mono expo-font
 *
 *   import { useFonts, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
 *   import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from '@expo-google-fonts/jetbrains-mono';
 *
 *   const [fontsLoaded] = useFonts({
 *     Poppins_500Medium,
 *     Poppins_600SemiBold,
 *     Poppins_700Bold,
 *     JetBrainsMono_500Medium,
 *     JetBrainsMono_700Bold,
 *   });
 *
 * If the fonts aren't loaded, this component falls back to the
 * system font automatically — it will never crash.
 * ------------------------------------------------------------------
 */

export interface QuotationLineItem {
    description: string;
    rateType: string;
    billableHours: number;
    unitPrice: number;
    subtotal?: number; // optional — auto-calculated if omitted
}

export interface QuotationBreakdownProps {
    items: QuotationLineItem[];
    /** Override the badge value. Defaults to sum of all item billable hours */
    totalBillableHours?: number;
    subtotalExGst: number;
    gstAmount: number;
    quoteTotal: number;
    /** e.g. "Pay In Full Discount (5%)" — omit to hide the discount row */
    discountLabel?: string;
    discountAmount?: number;
    amountPayable: number;
    title?: string;
    /** Pass false if you haven't loaded the custom fonts */
    useCustomFonts?: boolean;
}

const FONTS = {
    heading: 'Poppins_700Bold',
    subheading: 'Poppins_600SemiBold',
    body: 'Poppins_500Medium',
    mono: 'JetBrainsMono_500Medium',
    monoBold: 'JetBrainsMono_700Bold',
};

const SYSTEM_FONTS = {
    heading: undefined,
    subheading: undefined,
    body: undefined,
    mono: undefined,
    monoBold: undefined,
};

const fmtMoney = (n: number) =>
    `$${(Number.isFinite(n) ? n : 0).toLocaleString('en-AU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;

const fmtHours = (n: number) => (Number.isFinite(n) ? n : 0).toFixed(2);

export default function QuotationBreakdown({
    items,
    totalBillableHours,
    subtotalExGst,
    gstAmount,
    quoteTotal,
    discountLabel,
    discountAmount,
    amountPayable,
    title = 'Quotation Breakdown',
    useCustomFonts = true,
}: QuotationBreakdownProps) {
    const f = useCustomFonts ? FONTS : SYSTEM_FONTS;

    const computedHours =
        totalBillableHours ??
        items.reduce((sum, item) => sum + (item.billableHours || 0), 0);

    const showDiscount =
        !!discountLabel && typeof discountAmount === 'number' && discountAmount > 0;

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.headerRow}>
                <View style={styles.headerLeft}>
                    <View style={styles.headerIconWrap}>
                        <Receipt size={16} color="#0A7C6E" />
                    </View>
                    <Text style={[styles.headerTitle, f.heading && { fontFamily: f.heading }]}>
                        {title}
                    </Text>
                </View>

                <View style={styles.hoursBadge}>
                    <Text style={[styles.hoursBadgeText, f.subheading && { fontFamily: f.subheading }]}>
                        {fmtHours(computedHours)} Total Billable Hours
                    </Text>
                </View>
            </View>

            {/* Column headers — hidden on very small screens via numberOfLines/ellipsis is not needed,
          they wrap naturally since flex basis is generous */}
            <View style={styles.colHeaderRow}>
                <Text style={[styles.colHeader, styles.colDescription, f.subheading && { fontFamily: f.subheading }]}>
                    DESCRIPTION
                </Text>
                <Text style={[styles.colHeader, styles.colRateType, f.subheading && { fontFamily: f.subheading }]}>
                    RATE TYPE
                </Text>
                <Text style={[styles.colHeader, styles.colHours, f.subheading && { fontFamily: f.subheading }]}>
                    HOURS
                </Text>
                <Text style={[styles.colHeader, styles.colPrice, f.subheading && { fontFamily: f.subheading }]}>
                    RATE
                </Text>
                <Text style={[styles.colHeader, styles.colSubtotal, f.subheading && { fontFamily: f.subheading }]}>
                    SUBTOTAL
                </Text>
            </View>

            {/* Line items */}
            {items.length === 0 ? (
                <Text style={[styles.emptyText, f.body && { fontFamily: f.body }]}>
                    No billable items to display
                </Text>
            ) : (
                items.map((item, index) => {
                    const lineSubtotal =
                        item.subtotal ?? item.billableHours * item.unitPrice;
                    return (
                        <View key={index}>
                            <View style={styles.itemRow}>
                                <View style={styles.colDescription}>
                                    <Text
                                        style={[styles.itemDescription, f.subheading && { fontFamily: f.subheading }]}
                                        numberOfLines={3}
                                    >
                                        {item.description}
                                    </Text>
                                </View>

                                <View style={styles.colRateType}>
                                    <Text
                                        style={[styles.itemRateType, f.body && { fontFamily: f.body }]}
                                        numberOfLines={3}
                                    >
                                        {item.rateType}
                                    </Text>
                                </View>

                                <View style={styles.colHours}>
                                    <Text style={[styles.itemHours, f.monoBold && { fontFamily: f.monoBold }]}>
                                        {fmtHours(item.billableHours)}
                                    </Text>
                                </View>

                                <View style={styles.colPrice}>
                                    <Text style={[styles.itemPrice, f.mono && { fontFamily: f.mono }]}>
                                        {fmtMoney(item.unitPrice)}
                                    </Text>
                                </View>

                                <View style={styles.colSubtotal}>
                                    <Text style={[styles.itemSubtotal, f.monoBold && { fontFamily: f.monoBold }]}>
                                        {fmtMoney(lineSubtotal)}
                                    </Text>
                                </View>
                            </View>

                            {index !== items.length - 1 && <View style={styles.dashedDivider} />}
                        </View>
                    );
                })
            )}

            {/* Totals */}
            <View style={styles.totalsBlock}>
                <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, f.mono && { fontFamily: f.mono }]}>
                        Subtotal (Ex GST)
                    </Text>
                    <Text style={[styles.totalValue, f.mono && { fontFamily: f.mono }]}>
                        {fmtMoney(subtotalExGst)}
                    </Text>
                </View>

                <View style={styles.totalRow}>
                    <Text style={[styles.totalLabel, f.mono && { fontFamily: f.mono }]}>
                        GST (10%)
                    </Text>
                    <Text style={[styles.totalValue, f.mono && { fontFamily: f.mono }]}>
                        {fmtMoney(gstAmount)}
                    </Text>
                </View>

                <View style={styles.solidDivider} />

                <View style={styles.totalRow}>
                    <Text style={[styles.quoteTotalLabel, f.monoBold && { fontFamily: f.monoBold }]}>
                        Quote Total
                    </Text>
                    <Text style={[styles.quoteTotalValue, f.monoBold && { fontFamily: f.monoBold }]}>
                        {fmtMoney(quoteTotal)}
                    </Text>
                </View>

                {showDiscount && (
                    <View style={styles.totalRow}>
                        <Text style={[styles.totalLabel, f.mono && { fontFamily: f.mono }]}>
                            {discountLabel}
                        </Text>
                        <Text style={[styles.discountValue, f.mono && { fontFamily: f.mono }]}>
                            -{fmtMoney(discountAmount as number)}
                        </Text>
                    </View>
                )}

                <View style={styles.solidDivider} />

                <View style={[styles.totalRow, styles.payableRow]}>
                    <Text style={[styles.payableLabel, f.heading && { fontFamily: f.heading }]}>
                        Amount Payable
                    </Text>
                    <Text style={[styles.payableValue, f.heading && { fontFamily: f.heading }]}>
                        {fmtMoney(amountPayable)}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        padding: 18,
        marginBottom: 18,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.06,
        shadowRadius: 18,
        elevation: 4,
    },

    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 10,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerIconWrap: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: '#DFF7F3',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0F172A',
    },
    hoursBadge: {
        backgroundColor: '#0A7C6E',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
    },
    hoursBadgeText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },

    colHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 10,
        marginBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#EEF2F6',
    },
    colHeader: {
        fontSize: 10.5,
        fontWeight: '800',
        color: '#94A3B8',
        letterSpacing: 0.6,
    },

    colDescription: { flex: 2.6, paddingRight: 6 },
    colRateType: { flex: 2, paddingRight: 6 },
    colHours: { flex: 1, alignItems: 'flex-end' },
    colPrice: { flex: 1.1, alignItems: 'flex-end' },
    colSubtotal: { flex: 1.3, alignItems: 'flex-end' },

    itemRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 12,
    },
    itemDescription: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F172A',
        lineHeight: 18,
    },
    itemRateType: {
        fontSize: 11.5,
        color: '#94A3B8',
        lineHeight: 16,
    },
    itemHours: {
        fontSize: 13.5,
        fontWeight: '700',
        color: '#0F172A',
        textAlign: 'right',
    },
    itemPrice: {
        fontSize: 12.5,
        color: '#94A3B8',
        textAlign: 'right',
    },
    itemSubtotal: {
        fontSize: 13.5,
        fontWeight: '800',
        color: '#0A7C6E',
        textAlign: 'right',
    },

    dashedDivider: {
        borderBottomWidth: 1,
        borderStyle: 'dashed',
        borderBottomColor: '#E2E8F0',
    },

    emptyText: {
        textAlign: 'center',
        paddingVertical: 24,
        fontSize: 13,
        color: '#94A3B8',
        fontStyle: 'italic',
    },

    totalsBlock: {
        marginTop: 14,
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: '#EEF2F6',
    },
    totalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 7,
    },
    totalLabel: {
        fontSize: 13,
        color: '#475569',
    },
    totalValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F172A',
    },
    discountValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#16A34A',
    },

    solidDivider: {
        height: 1,
        backgroundColor: '#0F172A',
        opacity: 0.08,
        marginVertical: 8,
    },

    quoteTotalLabel: {
        fontSize: 14.5,
        fontWeight: '800',
        color: '#0F172A',
    },
    quoteTotalValue: {
        fontSize: 14.5,
        fontWeight: '800',
        color: '#0F172A',
    },

    payableRow: {
        paddingTop: 6,
    },
    payableLabel: {
        fontSize: 17,
        fontWeight: '900',
        color: '#0F172A',
    },
    payableValue: {
        fontSize: 20,
        fontWeight: '900',
        color: '#0A7C6E',
    },
});