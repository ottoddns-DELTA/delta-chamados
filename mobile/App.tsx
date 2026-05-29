import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Image,
  Linking,
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
    shouldShowBanner: true,
    shouldShowList: true,
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
  criado_por_nome?: string;
  condominio: number;
  imagem?: string | null;
  urgente: boolean;
  status: "aberto" | "andamento" | "resolvido";
  criado_em?: string;
  resolvido_em?: string | null;
};

type LoginResponse = {
  token: string;
  user: Usuario;
};

type PushEstado = "verificando" | "ativo" | "erro";

const APP_MARK = require("./assets/icon.png");

function montarUrlImagem(imagem?: string | null) {
  if (!imagem) {
    return "";
  }

  const url = imagem.startsWith("http") ? imagem : `${API_URL}${imagem}`;

  if (url.startsWith("http://")) {
    return encodeURI(url.replace("http://", "https://"));
  }

  return encodeURI(url);
}

function formatarData(data?: string | null) {
  if (!data) {
    return "nao informado";
  }

  const valor = new Date(data);
  const doisDigitos = (numero: number) => String(numero).padStart(2, "0");

  return `${doisDigitos(valor.getDate())}/${doisDigitos(
    valor.getMonth() + 1
  )}/${valor.getFullYear()} ${doisDigitos(valor.getHours())}:${doisDigitos(
    valor.getMinutes()
  )}`;
}

export default function App() {
  const [token, setToken] = useState("");
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [erro, setErro] = useState("");
  const [pushEstado, setPushEstado] = useState<PushEstado>("verificando");
  const [pushDetalhe, setPushDetalhe] = useState("");
  const [imagensComErro, setImagensComErro] = useState<number[]>([]);
  const pushRegistroIniciado = useRef(false);

  const headers = useMemo(
    () => ({
      Authorization: `Token ${token}`,
    }),
    [token]
  );

  const podeIniciarAtendimento =
    usuario?.perfil === "admin" || usuario?.perfil === "tecnico";

  const pushInfo = useMemo(() => {
    if (pushEstado === "ativo") {
      return {
        cor: "#22c55e",
        texto: "Alertas ativos",
      };
    }

    if (pushEstado === "erro") {
      return {
        cor: "#ef4444",
        texto: pushDetalhe || "Alertas inativos",
      };
    }

    return {
      cor: "#3b82f6",
      texto: "Verificando alertas",
    };
  }, [pushDetalhe, pushEstado]);

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
    setPushEstado("verificando");
    setPushDetalhe("");

    if (!Device.isDevice) {
      setPushEstado("erro");
      setPushDetalhe("Use um aparelho fisico");
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
      setPushEstado("erro");
      setPushDetalhe("Permita notificacoes");
      return;
    }

    const projectId =
      Constants.easConfig?.projectId ??
      Constants.expoConfig?.extra?.eas?.projectId;
    setPushEstado("verificando");
    const expoToken = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

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

    setPushEstado("ativo");
    setPushDetalhe("");
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
    setPushEstado("verificando");
    setPushDetalhe("");
    setImagensComErro([]);
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
    if (!token) {
      return;
    }

    function atualizarEmSeguida() {
      setPushEstado("ativo");
      setTimeout(() => {
        carregarChamados().catch(() => undefined);
      }, 700);
    }

    const recebido = Notifications.addNotificationReceivedListener(
      atualizarEmSeguida
    );
    const clicado = Notifications.addNotificationResponseReceivedListener(
      atualizarEmSeguida
    );
    const estado = AppState.addEventListener("change", (proximoEstado) => {
      if (proximoEstado === "active") {
        carregarChamados().catch(() => undefined);
      }
    });

    Notifications.getLastNotificationResponseAsync()
      .then((resposta) => {
        if (resposta) {
          atualizarEmSeguida();
        }
      })
      .catch(() => undefined);

    return () => {
      recebido.remove();
      clicado.remove();
      estado.remove();
    };
  }, [carregarChamados, token]);

  useEffect(() => {
    if (!token || pushRegistroIniciado.current) {
      return;
    }

    pushRegistroIniciado.current = true;
    registrarPush(token).catch((error) => {
      setPushEstado("erro");
      setPushDetalhe(
        error instanceof Error
          ? error.message.replace(API_URL, "API")
          : "Erro ao registrar alertas"
      );
    });
  }, [token]);

  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        <View style={styles.loginBox}>
          <View style={styles.loginBrand}>
            <Image source={APP_MARK} style={styles.loginMark} />
            <Text style={styles.logo}>Delta Chamados</Text>
          </View>
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
        <View style={styles.headerInfo}>
          <View style={styles.headerBrand}>
            <Image source={APP_MARK} style={styles.headerMark} />
            <Text style={styles.logo}>Chamados</Text>
          </View>
          <Text style={styles.subtitle}>
            {usuario?.nome} - {usuario?.perfil}
          </Text>
          <TouchableOpacity
            style={styles.pushRow}
            onPress={() =>
              registrarPush(token).catch((error) => {
                setPushEstado("erro");
                setPushDetalhe(
                  error instanceof Error
                    ? error.message.replace(API_URL, "API")
                    : "Erro ao registrar alertas"
                );
              })
            }
          >
            <View style={[styles.pushDot, { backgroundColor: pushInfo.cor }]} />
            <Text style={styles.pushStatus}>{pushInfo.texto}</Text>
          </TouchableOpacity>
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
            <Text style={styles.openedBy}>
              Aberto por: {item.criado_por_nome || "nao informado"}
            </Text>
            <Text style={styles.openedBy}>
              Aberto em: {formatarData(item.criado_em)}
            </Text>
            {item.resolvido_em ? (
              <Text style={styles.openedBy}>
                Resolvido em: {formatarData(item.resolvido_em)}
              </Text>
            ) : null}
            <Text style={styles.description}>{item.descricao}</Text>

            {item.imagem && !imagensComErro.includes(item.id) ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => Linking.openURL(montarUrlImagem(item.imagem))}
              >
                <Image
                  source={{ uri: montarUrlImagem(item.imagem) }}
                  style={styles.ticketImage}
                  resizeMode="contain"
                  onError={() =>
                    setImagensComErro((ids) =>
                      ids.includes(item.id) ? ids : [...ids, item.id]
                    )
                  }
                />
              </TouchableOpacity>
            ) : null}

            {item.imagem && imagensComErro.includes(item.id) ? (
              <TouchableOpacity
                style={styles.imageFallback}
                onPress={() => Linking.openURL(montarUrlImagem(item.imagem))}
              >
                <Text style={styles.imageFallbackText}>
                  Imagem nao carregou. Toque para abrir.
                </Text>
              </TouchableOpacity>
            ) : null}

            {item.urgente ? <Text style={styles.urgent}>Urgente</Text> : null}

            <View style={styles.actions}>
              {item.status === "aberto" && podeIniciarAtendimento ? (
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
  loginBrand: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  loginMark: {
    borderRadius: 10,
    height: 42,
    width: 42,
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
    color: "#a1a1aa",
    fontSize: 12,
  },
  pushRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    marginTop: 5,
  },
  pushDot: {
    borderRadius: 999,
    height: 9,
    width: 9,
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
  headerInfo: {
    flex: 1,
    paddingRight: 12,
  },
  headerBrand: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  headerMark: {
    borderRadius: 8,
    height: 30,
    width: 30,
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
  openedBy: {
    color: "#71717a",
    fontSize: 13,
    marginTop: 4,
  },
  description: {
    color: "#e4e4e7",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 12,
  },
  ticketImage: {
    backgroundColor: "#09090b",
    borderColor: "#27272a",
    borderRadius: 8,
    borderWidth: 1,
    height: 170,
    marginTop: 14,
    width: "100%",
  },
  imageFallback: {
    alignItems: "center",
    backgroundColor: "#09090b",
    borderColor: "#3f3f46",
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 14,
    padding: 18,
  },
  imageFallbackText: {
    color: "#a1a1aa",
    fontSize: 13,
    textAlign: "center",
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
