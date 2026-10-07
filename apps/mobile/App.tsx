import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { DEFAULT_ROLES, PERMISSIONS } from "@pharma/contracts";
import { outbox, type OutboxMutation } from "./src/services/outbox";
import { signInvoiceOffline, type OfflineSignedInvoice } from "./src/services/offline-signer";
import { syncEngine, type NetworkMode } from "./src/services/sync-engine";

export default function App() {
  const [networkMode, setNetworkMode] = useState<NetworkMode>("OFFLINE");
  const [items, setItems] = useState<OutboxMutation[]>([]);
  const [latestSigned, setLatestSigned] = useState<OfflineSignedInvoice | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>("");
  const [invoiceCounter, setInvoiceCounter] = useState(101);

  useEffect(() => {
    const unsub = outbox.subscribe(setItems);
    return unsub;
  }, []);

  const handleNetworkChange = (mode: NetworkMode) => {
    setNetworkMode(mode);
    syncEngine.setNetworkMode(mode);
  };

  const handleCreateOfflineSale = () => {
    // 1. Build and sign invoice locally on device (0 network latency)
    const signed = signInvoiceOffline({
      invoiceNumber: invoiceCounter,
      customerName: "Juan Pérez",
      customerNit: "4920192015",
      items: [
        { name: "Amoxicilina 500mg (Caja 20)", quantity: 2, unitPrice: 35.5 },
        { name: "Paracetamol 500mg (Blister)", quantity: 3, unitPrice: 5.0 },
      ],
      cufd: "B49F9A10DE783C", // Cached CUFD
    });

    setLatestSigned(signed);
    setInvoiceCounter((c) => c + 1);

    // 2. Append to local Outbox queue immediately
    outbox.add(
      "sale.create",
      {
        invoiceNumber: invoiceCounter,
        total: signed.total,
        cuf: signed.cuf,
      },
      signed.xml,
    );
  };

  const handleSyncOutbox = async () => {
    setSyncStatus("Syncing...");
    const result = await syncEngine.flush();
    setSyncStatus(result.message);
  };

  const pendingCount = items.filter((i) => i.status === "PENDING" || i.status === "FAILED").length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Pharma ERP Mobile</Text>
          <Text style={styles.subtitle}>Offline-First &amp; 2G/3G POS Terminal</Text>
        </View>

        {/* Network Status Toggle */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Simulated Network Mode</Text>
          <View style={styles.modeRow}>
            {(["OFFLINE", "SLOW_2G_3G", "ONLINE"] as NetworkMode[]).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.modeButton,
                  networkMode === mode && styles.modeButtonActive,
                ]}
                onPress={() => handleNetworkChange(mode)}
              >
                <Text
                  style={[
                    styles.modeButtonText,
                    networkMode === mode && styles.modeButtonTextActive,
                  ]}
                >
                  {mode === "SLOW_2G_3G" ? "2G / 3G" : mode}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Action Controls */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Actions</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={handleCreateOfflineSale}>
            <Text style={styles.buttonText}>
              + Create Offline Sale &amp; Sign Invoice
            </Text>
          </TouchableOpacity>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.secondaryButton, styles.flexButton]}
              onPress={handleSyncOutbox}
            >
              <Text style={styles.secondaryButtonText}>Sync Outbox ({pendingCount})</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.outlineButton, styles.flexButton]}
              onPress={() => outbox.clearSynced()}
            >
              <Text style={styles.outlineButtonText}>Clear Synced</Text>
            </TouchableOpacity>
          </View>

          {syncStatus ? <Text style={styles.statusText}>{syncStatus}</Text> : null}
        </View>

        {/* Latest Offline Signed Invoice */}
        {latestSigned && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Latest Signed Invoice (Local Device)</Text>
            <Text style={styles.metaLabel}>Control Code (CUF):</Text>
            <Text style={styles.codeText}>{latestSigned.cuf}</Text>
            <Text style={styles.metaLabel}>Signed At: {latestSigned.signedAt}</Text>
            <Text style={styles.metaLabel}>Total: BOB {latestSigned.total.toFixed(2)}</Text>
            <Text style={styles.metaLabel}>XML-DSig Signature:</Text>
            <Text numberOfLines={4} style={styles.xmlSnippet}>
              {latestSigned.xml}
            </Text>
          </View>
        )}

        {/* Outbox Queue */}
        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Local Outbox Queue</Text>
            <Text style={styles.badge}>{items.length} items</Text>
          </View>

          {items.length === 0 ? (
            <Text style={styles.emptyText}>Outbox is empty. Create a sale above.</Text>
          ) : (
            items.map((item) => (
              <View key={item.id} style={styles.queueItem}>
                <View style={styles.rowBetween}>
                  <Text style={styles.queueAction}>{item.action}</Text>
                  <Text
                    style={[
                      styles.statusBadge,
                      item.status === "SYNCED" && styles.statusBadgeSuccess,
                      item.status === "SYNCING" && styles.statusBadgeWarning,
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
                <Text style={styles.queueId}>{item.id} • {item.createdAt.slice(11, 19)}</Text>
              </View>
            ))
          )}
        </View>

        {/* Monorepo Contracts Integration Probe */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>@pharma/contracts (Shared RBAC)</Text>
          <Text style={styles.infoText}>
            Catalog Permissions: {PERMISSIONS.length} defined
          </Text>
          <Text style={styles.infoText}>
            Pharmacist Roles: {DEFAULT_ROLES.PHARMACIST?.join(", ")}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090d16",
  },
  scroll: {
    padding: 16,
    gap: 12,
  },
  header: {
    paddingVertical: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#f8fafc",
  },
  subtitle: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 2,
  },
  card: {
    backgroundColor: "#131b2e",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
    gap: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#e2e8f0",
  },
  modeRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#1e293b",
    alignItems: "center",
  },
  modeButtonActive: {
    backgroundColor: "#2563eb",
  },
  modeButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94a3b8",
  },
  modeButtonTextActive: {
    color: "#ffffff",
  },
  primaryButton: {
    backgroundColor: "#10b981",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  flexButton: {
    flex: 1,
  },
  secondaryButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: "#334155",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  outlineButtonText: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "500",
  },
  statusText: {
    fontSize: 12,
    color: "#38bdf8",
    textAlign: "center",
    marginTop: 4,
  },
  metaLabel: {
    fontSize: 12,
    color: "#94a3b8",
  },
  codeText: {
    fontSize: 13,
    color: "#38bdf8",
    fontFamily: "monospace",
    fontWeight: "600",
  },
  xmlSnippet: {
    fontSize: 10,
    color: "#64748b",
    fontFamily: "monospace",
    backgroundColor: "#0b1120",
    padding: 8,
    borderRadius: 6,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    fontSize: 11,
    color: "#38bdf8",
    backgroundColor: "#0c4a6e",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 12,
    color: "#64748b",
    fontStyle: "italic",
    paddingVertical: 6,
  },
  queueItem: {
    backgroundColor: "#0b1120",
    padding: 10,
    borderRadius: 8,
    gap: 4,
  },
  queueAction: {
    fontSize: 13,
    fontWeight: "600",
    color: "#f1f5f9",
  },
  queueId: {
    fontSize: 10,
    color: "#64748b",
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#f59e0b",
    backgroundColor: "#451a03",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeSuccess: {
    color: "#10b981",
    backgroundColor: "#064e3b",
  },
  statusBadgeWarning: {
    color: "#38bdf8",
    backgroundColor: "#0c4a6e",
  },
  infoText: {
    fontSize: 12,
    color: "#94a3b8",
  },
});
