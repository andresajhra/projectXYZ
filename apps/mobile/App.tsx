import React from "react";
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
  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="auto" />
      <View className="flex-1 justify-center items-center p-6">
        <Card className="w-full max-w-sm border-border bg-card">
          <CardHeader className="items-center">
            <Text className="text-xs font-bold uppercase tracking-wider text-primary">
              PharmaApp
            </Text>
            <CardTitle className="text-2xl font-bold text-foreground">
              ERP Mobile
            </CardTitle>
            <CardDescription className="text-center text-muted-foreground">
              Built with React Native Reusables & NativeWind (Tailwind CSS)
            </CardDescription>
          </CardHeader>
          <CardContent className="gap-2">
            <Text className="text-sm text-center text-muted-foreground">
              Ready to start mobile development with shadcn-like UI.
            </Text>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button
              className="w-full"
              onPress={() => console.log("Comenzar pressed")}
            >
              <Text>Comenzar</Text>
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onPress={() => console.log("Secondary action")}
            >
              <Text>Explorar Catálogo</Text>
            </Button>
          </CardFooter>
        </Card>
      </View>
      <PortalHost />
    </SafeAreaView>
  );
}
