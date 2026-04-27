import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import type { InvoiceLineItem, InvoiceData } from '../types';

// 日本語フォントを登録
Font.register({
  family: 'NotoSansJP',
  src: 'https://raw.githubusercontent.com/minoryorg/Noto-Sans-CJK-JP/master/fonts/NotoSansCJKjp-Regular.ttf',
});

// PDF内のスタイル定義
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'NotoSansJP',
    fontSize: 12,
    backgroundColor: '#FFFFFF',
    color: '#333333',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  monthTitle: {
    fontSize: 12,
    color: '#666666',
  },
  tenantBox: {
    marginBottom: 40,
    paddingBottom: 10,
    borderBottomWidth: 2,
    borderBottomColor: '#2563eb',
  },
  tenantName: {
    fontSize: 18,
    fontWeight: 'normal',
  },
  table: {
    width: '100%',
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  colType: {
    width: '20%',
    fontWeight: 'normal',
  },
  colPrev: {
    width: '15%',
    textAlign: 'right',
  },
  colCur: {
    width: '15%',
    textAlign: 'right',
  },
  colUsage: {
    width: '20%',
    textAlign: 'right',
  },
  colFee: {
    width: '30%',
    textAlign: 'right',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#000000',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'normal',
    marginRight: 20,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: 'normal',
    color: '#2563eb',
  },
});

export type { InvoiceLineItem, InvoiceData };

export const InvoicePDFDocument = ({ invoices }: { invoices: InvoiceData[] }) => {
  return (
    <Document>
      {invoices.map((inv) => (
        <Page key={inv.groupId} size="A4" style={styles.page}>
          
          <View style={styles.headerContainer}>
            <Text style={styles.title}>御請求書</Text>
            <Text style={styles.monthTitle}>請求対象月: {inv.billingMonth}</Text>
          </View>

          <View style={styles.tenantBox}>
            <Text style={styles.tenantName}>{inv.recipientName} 御中</Text>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colType}>ご請求項目</Text>
              <Text style={styles.colPrev}>前月指針</Text>
              <Text style={styles.colCur}>当月指針</Text>
              <Text style={styles.colUsage}>使用量</Text>
              <Text style={styles.colFee}>金額</Text>
            </View>

            {inv.items.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={styles.colType}>{item.label}</Text>
                <Text style={styles.colPrev}>{item.previousValue?.toLocaleString()}</Text>
                <Text style={styles.colCur}>{item.currentValue?.toLocaleString()}</Text>
                <Text style={styles.colUsage}>
                  {item.usage.toLocaleString()}
                  {item.type === 'water' ? ' m³' : ''}
                </Text>
                <Text style={styles.colFee}>¥ {item.fee.toLocaleString()}</Text>
              </View>
            ))}
          </View>

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>合計ご請求額</Text>
            <Text style={styles.totalAmount}>¥ {inv.totalAmount.toLocaleString()}</Text>
          </View>

        </Page>
      ))}
    </Document>
  );
};
