import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const defaultHost =
  typeof window !== "undefined" && window.location && window.location.hostname
    ? window.location.hostname
    : "192.168.2.120";

const envApiBase =
  typeof process !== "undefined" &&
  process.env &&
  process.env.EXPO_PUBLIC_API_BASE_URL
    ? process.env.EXPO_PUBLIC_API_BASE_URL
    : null;

const API_BASE_URL = envApiBase || `http://${defaultHost}:4000`;

function getCardLabel(card) {
  if (!card) return "";
  const rankMap = {
    11: "J",
    12: "Q",
    13: "K",
    14: "A",
  };
  const suitMap = {
    0: "♠",
    1: "♥",
    2: "♣",
    3: "♦",
  };
  const rankStr = rankMap[card.rank] || String(card.rank);
  const suitStr = suitMap[card.suit] || "?";
  return `${suitStr}${rankStr}`;
}

function PrimaryButton({ title, onPress, disabled }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

function CardView({ card, revealed, large, animValue }) {
  const translateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-40, 0],
  });
  const rotateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ["90deg", "0deg"],
  });
  const opacity = animValue;

  const content = revealed ? getCardLabel(card) : "🂠";

  return (
    <Animated.View
      style={[
        styles.card,
        large && styles.cardLarge,
        {
          transform: [{ translateY }, { rotateY }],
          opacity,
        },
      ]}
    >
      <Text style={styles.cardText}>{content}</Text>
    </Animated.View>
  );
}

export default function App() {
  const [roomId, setRoomId] = useState(null);
  const [state, setState] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [joinRoomId, setJoinRoomId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const dealAnim = useRef(new Animated.Value(0)).current;

  function startDealAnimation() {
    dealAnim.setValue(0);
    Animated.timing(dealAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }

  async function callApi(path, options) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}${path}`, {
        headers: {
          "Content-Type": "application/json",
        },
        ...options,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const json = await res.json();
      return json;
    } catch (e) {
      setError(e.message || "网络错误");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateRoom() {
    const name = playerName.trim() || "玩家";
    const res = await callApi("/rooms", {
      method: "POST",
      body: JSON.stringify({ playerName: name }),
    });
    if (res && res.roomId && res.playerId) {
      setRoomId(res.roomId);
      setPlayerId(res.playerId);
      setState(res.state);
    }
  }

  async function handleJoinRoom() {
    const targetRoomId = joinRoomId.trim();
    if (!targetRoomId) {
      setError("请输入要加入的房间号");
      return;
    }
    const name = playerName.trim() || "玩家";
    const res = await callApi(`/rooms/${targetRoomId}/join`, {
      method: "POST",
      body: JSON.stringify({ playerName: name }),
    });
    if (res && res.roomId && res.playerId) {
      setRoomId(res.roomId);
      setPlayerId(res.playerId);
      setState(res.state);
    }
  }

  async function handleStartRound() {
    if (!roomId) return;
    const res = await callApi(`/rooms/${roomId}/start`, {
      method: "POST",
    });
    if (res && res.state) {
      setState(res.state);
      startDealAnimation();
    }
  }

  async function handleAction(action) {
    if (!roomId) return;
    if (!state || state.stage !== "betting") return;
    if (!playerId) return;
    const res = await callApi(`/rooms/${roomId}/action`, {
      method: "POST",
      body: JSON.stringify({ playerId, action }),
    });
    if (res && res.state) {
      setState(res.state);
    }
  }

  useEffect(() => {
    if (!roomId) return undefined;
    let stopped = false;
    const tick = async () => {
      if (!roomId || stopped) return;
      try {
        const res = await callApi(`/rooms/${roomId}`, {
          method: "GET",
        });
        if (res && res.state) {
          setState(res.state);
        }
      } catch (e) {
      }
    };
    const id = setInterval(tick, 1500);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [roomId]);

  const players = state ? state.players : [];
  const pot = state ? state.pot : 0;
  const stage = state ? state.stage : "idle";
  const lastResult = state ? state.lastResult : null;
  const currentPlayerIndex =
    state && typeof state.currentPlayerIndex === "number"
      ? state.currentPlayerIndex
      : null;
  const currentPlayer =
    currentPlayerIndex != null && players[currentPlayerIndex]
      ? players[currentPlayerIndex]
      : null;
  const selfPlayer = players.find((p) => p.id === playerId) || null;
  const others = players.filter((p) => p.id !== playerId);

  const canStartRound =
    roomId &&
    state &&
    (stage === "waiting_players" || stage === "round_finished");
  const canAct =
    stage === "betting" &&
    selfPlayer &&
    !selfPlayer.hasFolded &&
    currentPlayer &&
    currentPlayer.id === selfPlayer.id;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>无敌铁蛋炸金花</Text>
          <Text style={styles.subtitle}>
            {state ? `第 ${state.round || 0} 局` : "准备开始一局新的牌局"}
          </Text>
        </View>

        <View style={styles.roomBar}>
          <View style={styles.roomRow}>
            <Text style={styles.infoText}>
              你的昵称:
            </Text>
            <TextInput
              style={styles.input}
              placeholder="输入昵称"
              placeholderTextColor="#6b7280"
              value={playerName}
              onChangeText={setPlayerName}
            />
          </View>
          <View style={styles.roomRow}>
            <Text style={styles.infoText}>
              房间号:
            </Text>
            <TextInput
              style={styles.input}
              placeholder="加入房间请输入"
              placeholderTextColor="#6b7280"
              value={joinRoomId}
              onChangeText={setJoinRoomId}
            />
          </View>
          <View style={styles.roomButtons}>
            <PrimaryButton
              title={roomId ? `当前房间: ${roomId}` : "创建房间"}
              onPress={handleCreateRoom}
              disabled={loading}
            />
            <PrimaryButton
              title="加入房间"
              onPress={handleJoinRoom}
              disabled={loading}
            />
          </View>
        </View>

        <View style={styles.infoBar}>
          <Text style={styles.infoText}>底注: {state ? state.ante : 10}</Text>
          <Text style={styles.infoText}>奖池: {pot}</Text>
          <Text style={styles.infoText}>状态: {translateStage(stage)}</Text>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.table}>
            <View style={styles.aiRow}>
              {others.map((p) => {
                const isWinner =
                  lastResult && lastResult.winnerId === p.id;
                const isFolded = p.hasFolded;
                const isCurrent =
                  currentPlayer && currentPlayer.id === p.id;
                return (
                  <View
                    key={p.id}
                    style={[
                      styles.playerPanel,
                      isWinner && styles.playerWinner,
                      isFolded && styles.playerFolded,
                    ]}
                  >
                    <Text style={styles.playerName}>{p.name}</Text>
                    <Text style={styles.playerChips}>筹码: {p.chips}</Text>
                    <Text style={styles.playerStatus}>
                      {renderPlayerStatus(p, stage, false, isCurrent)}
                    </Text>
                    <View style={styles.cardRowSmall}>
                      {(p.hand || []).map((card, idx) => (
                        <CardView
                          key={idx}
                          card={card}
                          large={false}
                          revealed={stage === "round_finished"}
                          animValue={dealAnim}
                        />
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.centerPot}>
              <Text style={styles.potText}>奖池: {pot}</Text>
            </View>

            {selfPlayer && (
              <View style={styles.humanPanel}>
                <Text style={styles.playerName}>{selfPlayer.name}</Text>
                <Text style={styles.playerChips}>筹码: {selfPlayer.chips}</Text>
                <Text style={styles.playerStatus}>
                  {renderPlayerStatus(
                    selfPlayer,
                    stage,
                    true,
                    currentPlayer && currentPlayer.id === playerId,
                  )}
                </Text>
                <View style={styles.cardRow}>
                  {(selfPlayer.hand || []).map((card, idx) => (
                    <CardView
                      key={idx}
                      card={card}
                      large
                      revealed
                      animValue={dealAnim}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>

          {lastResult && (
            <View style={styles.resultBox}>
              <Text style={styles.resultTitle}>本局结果</Text>
              <Text style={styles.resultText}>{lastResult.reason}</Text>
              {lastResult.winnerEval && (
                <Text style={styles.resultText}>
                  牌型: {lastResult.winnerEval.typeName}
                </Text>
              )}
            </View>
          )}
        </ScrollView>

        <View style={styles.actionsBar}>
          <PrimaryButton
            title={canStartRound ? "发牌开局" : "下一局请稍后"}
            onPress={handleStartRound}
            disabled={!canStartRound || loading}
          />
          <View style={styles.actionRow}>
            <PrimaryButton
              title="跟注"
              onPress={() => handleAction("STAY")}
              disabled={!canAct || loading}
            />
            <PrimaryButton
              title="加注"
              onPress={() => handleAction("RAISE")}
              disabled={!canAct || loading}
            />
            <PrimaryButton
              title="弃牌"
              onPress={() => handleAction("FOLD")}
              disabled={!canAct || loading}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function translateStage(stage) {
  if (stage === "waiting_players") return "等待玩家加入";
  if (stage === "betting") return "轮流行动中";
  if (stage === "round_finished") return "本局结束";
  return "未知";
}

function renderPlayerStatus(player, stage, isSelf, isCurrentTurn) {
  if (player.hasFolded) return "已弃牌";
  if (stage === "waiting_players") return "等待开始";
  if (stage === "betting" && isSelf && isCurrentTurn) {
    return "请选择跟注、加注或弃牌";
  }
  if (stage === "betting" && isSelf) return "等待轮到你";
  if (stage === "betting" && isCurrentTurn) return "当前行动玩家";
  if (stage === "betting") return "等待其他玩家行动";
  if (stage === "round_finished") return "本局结束";
  return "";
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0b1020",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  header: {
    paddingVertical: 8,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#f5f5f5",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 14,
    color: "#cbd5f5",
  },
  infoBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 4,
    borderRadius: 8,
    backgroundColor: "#161b32",
  },
  roomBar: {
    marginTop: 4,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#020617",
  },
  roomRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  roomButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  input: {
    flex: 1,
    height: 32,
    marginLeft: 8,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#020617",
    color: "#e5e7eb",
    borderWidth: 1,
    borderColor: "#4b5563",
    fontSize: 12,
  },
  infoText: {
    color: "#e5e7eb",
    fontSize: 12,
  },
  errorBox: {
    marginTop: 4,
    padding: 8,
    borderRadius: 6,
    backgroundColor: "#7f1d1d",
  },
  errorText: {
    color: "#fee2e2",
    fontSize: 12,
  },
  scroll: {
    flex: 1,
    marginTop: 4,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  table: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    backgroundColor: "#111827",
  },
  aiRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  playerPanel: {
    flex: 1,
    marginHorizontal: 4,
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#1f2937",
  },
  playerWinner: {
    borderWidth: 1,
    borderColor: "#fbbf24",
  },
  playerFolded: {
    opacity: 0.6,
  },
  playerName: {
    color: "#f9fafb",
    fontWeight: "600",
  },
  playerChips: {
    marginTop: 2,
    color: "#e5e7eb",
    fontSize: 12,
  },
  playerStatus: {
    marginTop: 4,
    color: "#9ca3af",
    fontSize: 11,
  },
  cardRowSmall: {
    flexDirection: "row",
    marginTop: 8,
  },
  centerPot: {
    marginTop: 12,
    marginBottom: 12,
    alignItems: "center",
  },
  potText: {
    color: "#fbbf24",
    fontSize: 16,
    fontWeight: "600",
  },
  humanPanel: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#1f2937",
  },
  cardRow: {
    flexDirection: "row",
    marginTop: 12,
    justifyContent: "center",
  },
  card: {
    width: 42,
    height: 60,
    borderRadius: 6,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#4b5563",
    backgroundColor: "#111827",
    alignItems: "center",
   justifyContent: "center",
  },
  cardLarge: {
    width: 60,
    height: 84,
    marginHorizontal: 6,
  },
  cardText: {
    fontSize: 18,
    color: "#f9fafb",
  },
  resultBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#111827",
  },
  resultTitle: {
    color: "#f9fafb",
    fontWeight: "600",
    marginBottom: 4,
  },
  resultText: {
    color: "#e5e7eb",
    fontSize: 12,
  },
  actionsBar: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "#2563eb",
    alignItems: "center",
    marginVertical: 4,
  },
  buttonDisabled: {
    backgroundColor: "#4b5563",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: "#f9fafb",
    fontWeight: "600",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
})
