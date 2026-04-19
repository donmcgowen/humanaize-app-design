/**
 * assistant.tsx — HumanAIze AI Assistant (Gemini-powered)
 *
 * Full-screen chat UI. Accessible via floating button from all tabs.
 * Gemini has full context: user profile, goals, health conditions, today's food log, workouts.
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const { width: W } = Dimensions.get("window");

const C = {
  bg: "#0f172a",
  card: "#1e293b",
  border: "#334155",
  accent: "#06b6d4",
  purple: "#8b5cf6",
  green: "#10b981",
  text: "#f1f5f9",
  muted: "#94a3b8",
  userBubble: "#06b6d4",
  aiBubble: "#1e293b",
};

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  "What should I eat for lunch today?",
  "How am I doing with my macros this week?",
  "Suggest a workout for today",
  "Am I on track to hit my goal weight?",
  "What foods are high in protein?",
  "How many calories should I eat to lose 1 lb/week?",
];

export default function AssistantScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const typingAnim = useRef(new Animated.Value(0)).current;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your HumanAIze AI assistant powered by Gemini. I have access to your profile, goals, food log, and workout history.\n\nAsk me anything about nutrition, fitness, or your progress — I'm here to help you reach your goals!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);

  // Typing animation
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(typingAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      typingAnim.stopAnimation();
      typingAnim.setValue(0);
    }
  }, [loading]);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const sendMessage = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    setInput("");
    setShowQuickPrompts(false);
    setLoading(true);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch("https://humanaize.life/trpc/ai.askAssistant", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          json: {
            message: content,
            context: "mobile_app",
          },
        }),
      });
      const json = await res.json();
      const reply =
        json?.result?.data?.json?.response ??
        json?.result?.data?.response ??
        json?.result?.data?.message ??
        "I'm having trouble connecting right now. Please try again.";

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch {
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I couldn't connect to the server. Please check your internet connection and try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: C.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={18} color={C.purple} />
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Assistant</Text>
            <Text style={styles.headerSub}>Powered by Gemini</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => {
            setMessages([
              {
                id: "welcome-new",
                role: "assistant",
                content: "Chat cleared! How can I help you today?",
                timestamp: new Date(),
              },
            ]);
            setShowQuickPrompts(true);
          }}
          style={styles.headerBack}
        >
          <Ionicons name="refresh-outline" size={22} color={C.muted} />
        </TouchableOpacity>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.messageList}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="on-drag"
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageRow,
              msg.role === "user" ? styles.messageRowUser : styles.messageRowAI,
            ]}
          >
            {msg.role === "assistant" && (
              <View style={styles.aiAvatarSmall}>
                <Ionicons name="sparkles" size={14} color={C.purple} />
              </View>
            )}
            <View
              style={[
                styles.bubble,
                msg.role === "user" ? styles.bubbleUser : styles.bubbleAI,
              ]}
            >
              <Text
                style={[
                  styles.bubbleText,
                  msg.role === "user" && styles.bubbleTextUser,
                ]}
              >
                {msg.content}
              </Text>
              <Text
                style={[
                  styles.bubbleTime,
                  msg.role === "user" && { color: "rgba(255,255,255,0.6)" },
                ]}
              >
                {formatTime(msg.timestamp)}
              </Text>
            </View>
          </View>
        ))}

        {/* Typing indicator */}
        {loading && (
          <View style={[styles.messageRow, styles.messageRowAI]}>
            <View style={styles.aiAvatarSmall}>
              <Ionicons name="sparkles" size={14} color={C.purple} />
            </View>
            <View style={[styles.bubble, styles.bubbleAI, styles.typingBubble]}>
              {[0, 1, 2].map((i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.typingDot,
                    {
                      opacity: typingAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: i === 1 ? [0.3, 1] : [1, 0.3],
                      }),
                    },
                  ]}
                />
              ))}
            </View>
          </View>
        )}

        {/* Quick prompts */}
        {showQuickPrompts && messages.length <= 1 && (
          <View style={styles.quickPromptsContainer}>
            <Text style={styles.quickPromptsTitle}>Try asking:</Text>
            <View style={styles.quickPromptsList}>
              {QUICK_PROMPTS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={styles.quickPrompt}
                  onPress={() => sendMessage(p)}
                >
                  <Text style={styles.quickPromptText}>{p}</Text>
                  <Ionicons name="arrow-forward-outline" size={14} color={C.accent} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          ref={inputRef}
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder="Ask anything about nutrition or fitness..."
          placeholderTextColor={C.muted}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={() => sendMessage()}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => sendMessage()}
          disabled={!input.trim() || loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerBack: { padding: 8 },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginLeft: 4,
  },
  aiAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.purple + "20",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: C.purple + "40",
  },
  headerTitle: { color: C.text, fontSize: 16, fontWeight: "700" },
  headerSub: { color: C.muted, fontSize: 12 },

  messageList: {
    padding: 16,
    gap: 12,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    maxWidth: W * 0.85,
  },
  messageRowUser: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  messageRowAI: { alignSelf: "flex-start" },
  aiAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.purple + "20",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  bubble: {
    borderRadius: 18,
    padding: 12,
    paddingHorizontal: 14,
    maxWidth: W * 0.72,
    gap: 4,
  },
  bubbleUser: {
    backgroundColor: C.userBubble,
    borderBottomRightRadius: 4,
  },
  bubbleAI: {
    backgroundColor: C.aiBubble,
    borderWidth: 1,
    borderColor: C.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: { color: C.text, fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: "#fff" },
  bubbleTime: { color: C.muted, fontSize: 10, alignSelf: "flex-end" },

  typingBubble: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: "center",
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.muted,
  },

  quickPromptsContainer: { marginTop: 8, gap: 10 },
  quickPromptsTitle: { color: C.muted, fontSize: 13, fontWeight: "600" },
  quickPromptsList: { gap: 8 },
  quickPrompt: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  quickPromptText: { color: C.text, fontSize: 14, flex: 1 },

  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    padding: 12,
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  textInput: {
    flex: 1,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: C.text,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: C.border },
});
