import React, { useState } from "react";
import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { PortalHost } from "@rn-primitives/portal";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export default function App() {
  const [tapCount, setTapCount] = useState(0);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="auto" />
      <View className="flex-1 justify-center items-center p-6">
        <Card className="w-full max-w-sm border-border bg-card shadow-sm">
          <CardHeader className="items-center">
            <Text className="text-xs font-bold uppercase tracking-wider text-primary">
              Pharma ERP · Mobile
            </Text>
            <CardTitle className="text-3xl font-extrabold text-foreground mt-1">
              Hello World
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground mt-1">
              Handheld warehouse barcode scanning & portable POS terminal.
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-2">
            <View className="bg-muted/40 p-3 rounded-lg border border-border/40">
              <Text className="text-xs text-center text-muted-foreground">
                NativeWind & React Native Reusables configured and ready.
              </Text>
              {tapCount > 0 && (
                <Text className="text-xs text-center font-bold text-primary mt-2">
                  Taps: {tapCount}
                </Text>
              )}
            </View>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button
              className="w-full"
              onPress={() => setTapCount((c) => c + 1)}
            >
              <Text>Ping Mobile</Text>
            </Button>
          </CardFooter>
        </Card>
      </View>
      <PortalHost />
    </SafeAreaView>
  );
}
