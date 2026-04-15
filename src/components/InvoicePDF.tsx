import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

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

export interface InvoiceInfraDetail {
  previousValue: number | null;
  currentValue: number | null;
  usage: number | null;
  fee: number | null;
}

export interface InvoiceData {
  tenantId: string;
  tenantName: string;
  billingMonth: string;
  light: InvoiceInfraDetail | null;
  power: InvoiceInfraDetail | null;
  water: InvoiceInfraDetail | null;
  totalAmount: number;
}

export const InvoicePDFDocument = ({ invoices }: { invoices: InvoiceData[] }) => {
  return (
    <Document>
      {invoices.map((inv) => (
        <Page key={inv.tenantId} size="A4" style={styles.page}>
          
          <View style={styles.headerContainer}>
            <Text style={styles.title}>御請求書</Text>
            <Text style={styles.monthTitle}>請求対象月: {inv.billingMonth}</Text>
          </View>

          <View style={styles.tenantBox}>
            <Text style={styles.tenantName}>{inv.tenantName} 御中</Text>
          </View>

          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={styles.colType}>ご請求項目</Text>
              <Text style={styles.colPrev}>前月指針</Text>
              <Text style={styles.colCur}>当月指針</Text>
              <Text style={styles.colUsage}>使用量</Text>
              <Text style={styles.colFee}>金額</Text>
            </View>

            {inv.light !== null && inv.light.fee !== null && (
              <View style={styles.tableRow}>
                <Text style={styles.colType}>電灯</Text>
                <Text style={styles.colPrev}>{inv.light.previousValue?.toLocaleString()}</Text>
                <Text style={styles.colCur}>{inv.light.currentValue?.toLocaleString()}</Text>
                <Text style={styles.colUsage}>{inv.light.usage?.toLocaleString()}</Text>
                <Text style={styles.colFee}>¥ {inv.light.fee?.toLocaleString()}</Text>
              </View>
            )}

            {inv.power !== null && inv.power.fee !== null && (
              <View style={styles.tableRow}>
                <Text style={styles.colType}>動力</Text>
                <Text style={styles.colPrev}>{inv.power.previousValue?.toLocaleString()}</Text>
                <Text style={styles.colCur}>{inv.power.currentValue?.toLocaleString()}</Text>
                <Text style={styles.colUsage}>{inv.power.usage?.toLocaleString()}</Text>
                <Text style={styles.colFee}>¥ {inv.power.fee?.toLocaleString()}</Text>
              </View>
            )}

            {inv.water !== null && inv.water.fee !== null && (
              <View style={styles.tableRow}>
                <Text style={styles.colType}>水道</Text>
                <Text style={styles.colPrev}>{inv.water.previousValue?.toLocaleString()}</Text>
                <Text style={styles.colCur}>{inv.water.currentValue?.toLocaleString()}</Text>
                <Text style={styles.colUsage}>{inv.water.usage?.toLocaleString()} m³</Text>
                <Text style={styles.colFee}>¥ {inv.water.fee?.toLocaleString()}</Text>
              </View>
            )}
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
