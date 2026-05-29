import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowAlert: true,
  }),
});

const API_URL =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ??
  "https://deltachamados.up.railway.app";

type Usuario = {
  id: number;
  username: string;
  perfil: "admin" | "monitoramento" | "tecnico";
  nome: string;
};

type Chamado = {
  id: number;
  titulo: string;
  descricao: string;
  condominio_nome?: string;
  condominio: number;
  urgente: boolean;
  status: "aberto" | "andamento" | "resolvido";
};

type LoginResponse = {
  token: string;
  user: Usuario;
};

export default function App() {
  const [token, setToken] = useState("");
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState("");
  const [pushStatus, setPushStatus] = useState("Push ainda não registrado");
  const pushRegistroIniciado = useRef(false);

  const headers = useMemo(
    () => ({
      Authorization: `Token ${token}`,
    }),
    [token]
  );

  const carregarChamados = useCallback(async () => {
    if (!token) {
      return;
    }

    const response = await fetch(`${API_URL}/api/chamados/`, {
      headers,
    });

    if (!response.ok) {
      throw new Error("Erro ao carregar chamados");
    }

    const data = (await response.json()) as Chamado[];
    setChamados(data.filter((chamado) => chamado.status !== "resolvido"));
  }, [headers, token]);

async function registrarPush(tokenAtual: string) {
    if (!Device.isDevice) {
      setPushStatus("Push disponível apenas em aparelho físico");
      return;
    }

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Chamados",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#2563eb",
      });
    }

    const permissaoAtual = await Notifications.getPermissionsAsync();
    let status = permissaoAtual.status;

    if (status !== "granted") {
      const novaPermissao = await Notifications.requestPermissionsAsync();
      status = novaPermissao.status;
    }

    if (status !== "granted") {
      setPushStatus("Permissão de notificação negada");
      return;
    }

    const projectId =
      Constants.easConfig?.projectId ??
      Constants.expoConfig?.extra?.eas?.projectId;
    setPushStatus("Gerando token push...");
    const expoToken = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    setPushStatus("Registrando aparelho...");
    const response = await fetch(`${API_URL}/api/push-devices/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${tokenAtual}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        token: expoToken.data,
        plataforma: "android",
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Erro ao registrar push: ${response.status} ${text}`);
    }

    setPushStatus("Push registrado");
  }

  async function entrar() {
    setErro("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });
      const data = (await response.json()) as LoginResponse & {
        detail?: string;
      };

      if (!response.ok) {
        setErro(data.detail || "Usuário ou senha inválidos.");
        return;
      }

      await AsyncStorage.multiSet([
        ["delta-token", data.token],
        ["delta-user", JSON.stringify(data.user)],
      ]);
      setToken(data.token);
      setUsuario(data.user);
      setPassword("");
    } catch (error) {
      setErro(
        `Não foi possível entrar. API: ${API_URL}. ${
          error instanceof Error ? error.message : ""
        }`
      );
    } finally {
      setLoading(false);
    }
  }

  async function sair() {
    await AsyncStorage.multiRemove(["delta-token", "delta-user"]);
    setToken("");
    setUsuario(null);
    setChamados([]);
    setPushStatus("Push ainda não registrado");
    pushRegistroIniciado.current = false;
  }

  async function alterarStatus(id: number, status: Chamado["status"]) {
    try {
      const response = await fetch(`${API_URL}/api/chamados/${id}/`, {
        method: "PATCH",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error("Erro ao atualizar chamado");
      }

      await carregarChamados();
    } catch {
      Alert.alert("Erro", "Não foi possível atualizar o chamado.");
    }
  }

  async function atualizar() {
    setRefreshing(true);

    try {
      await carregarChamados();
    } catch {
      Alert.alert("Erro", "Não foi possível atualizar os chamados.");
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    async function restaurarSessao() {
      const tokenSalvo = await AsyncStorage.getItem("delta-token");
      const usuarioSalvo = await AsyncStorage.getItem("delta-user");

      if (tokenSalvo && usuarioSalvo) {
        setToken(tokenSalvo);
        setUsuario(JSON.parse(usuarioSalvo));
      }

      setLoading(false);
    }

    restaurarSessao();
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    carregarChamados().catch(() => {
      setErro("Não foi possível carregar os chamados.");
    });
    const intervalo = setInterval(() => {
      carregarChamados().catch(() => undefined);
    }, 30000);

    return () => clearInterval(intervalo);
  }, [carregarChamados, token]);

  useEffect(() => {
    if (!token || pushRegistroIniciado.current) {
      return;
    }

    pushRegistroIniciado.current = true;
    registrarPush(token).catch((error) => {
      setPushStatus(
        error instanceof Error ? error.message : "Erro ao registrar push"
      );
    });
  }, [token]);

  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loginBox}>
          <Text style={styles.logo}>Delta Chamados</Text>
          <Text style={styles.subtitle}>Acesso técnico</Text>

          <TextInput
            autoCapitalize="none"
            placeholder="Usuário"
            placeholderTextColor="#71717a"
            style={styles.input}
            value={username}
            onChangeText={setUsername}
          />

          <TextInput
            placeholder="Senha"
            placeholderTextColor="#71717a"
            secureTextEntry
            style={styles.input}
            value={password}
            onChangeText={setPassword}
          />

          {erro ? <Text style={styles.error}>{erro}</Text> : null}

          <TouchableOpacity style={styles.primaryButton} onPress={entrar}>
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.primaryButtonText}>Entrar</Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View>
          <Text style={styles.logo}>Chamados</Text>
          <Text style={styles.subtitle}>
            {usuario?.nome} - {usuario?.perfil}
          </Text>
          <Text style={styles.pushStatus}>{pushStatus}</Text>
        </View>

        <TouchableOpacity style={styles.secondaryButton} onPress={sair}>
          <Text style={styles.secondaryButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        contentContainerStyle={styles.list}
        data={chamados}
        keyExtractor={(item) => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={atualizar} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nenhum chamado aberto.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.card, item.urgente && styles.urgentCard]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.titulo}</Text>
              <Text
                style={[
                  styles.badge,
                  item.status === "andamento" && styles.badgeBlue,
                ]}
              >
                {item.status}
              </Text>
            </View>

            <Text style={styles.condominio}>
              {item.condominio_nome || `Condomínio #${item.condominio}`}
            </Text>
            <Text style={styles.description}>{item.descricao}</Text>

            {item.urgente ? <Text style={styles.urgent}>Urgente</Text> : null}

            <View style={styles.actions}>
              {item.status === "aberto" ? (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => alterarStatus(item.id, "andamento")}
                >
                  <Text style={styles.actionButtonText}>Iniciar</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={[styles.actionButton, styles.resolveButton]}
                onPress={() => alterarStatus(item.id, "resolvido")}
              >
                <Text style={styles.actionButtonText}>Marcar como resolvido</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
  },
  loginBox: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 14,
  },
  logo: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "800",
  },
  subtitle: {
    color: "#a1a1aa",
    fontSize: 14,
  },
  pushStatus: {
    color: "#60a5fa",
    fontSize: 12,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#09090b",
    borderColor: "#27272a",
    borderRadius: 8,
    borderWidth: 1,
    color: "#fff",
    fontSize: 16,
    padding: 16,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
  },
  primaryButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryButton: {
    borderColor: "#3f3f46",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonText: {
    color: "#fff",
    fontWeight: "700",
  },
  error: {
    color: "#fecaca",
  },
  header: {
    alignItems: "center",
    borderBottomColor: "#27272a",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 18,
  },
  list: {
    gap: 14,
    padding: 18,
  },
  empty: {
    alignItems: "center",
    borderColor: "#27272a",
    borderRadius: 8,
    borderWidth: 1,
    padding: 24,
  },
  emptyText: {
    color: "#a1a1aa",
  },
  card: {
    backgroundColor: "#18181b",
    borderColor: "#27272a",
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  urgentCard: {
    borderColor: "#ef4444",
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  cardTitle: {
    color: "#fff",
    flex: 1,
    fontSize: 18,
    fontWeight: "800",
  },
  badge: {
    backgroundColor: "rgba(234, 179, 8, 0.16)",
    borderRadius: 999,
    color: "#facc15",
    fontSize: 12,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeBlue: {
    backgroundColor: "rgba(59, 130, 246, 0.16)",
    color: "#60a5fa",
  },
  condominio: {
    color: "#a1a1aa",
    marginTop: 8,
  },
  description: {
    color: "#e4e4e7",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
  },
  urgent: {
    color: "#f87171",
    fontWeight: "800",
    marginTop: 12,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  actionButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  resolveButton: {
    backgroundColor: "#16a34a",
  },
  actionButtonText: {
    color: "#fff",
    fontWeight: "800",
  },
});
