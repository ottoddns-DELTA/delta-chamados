"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type MouseEvent,
} from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://delta-chamados-production.up.railway.app";

const DIAS_NO_HISTORICO = 30;

type Aba =
  | "chamados"
  | "abertos"
  | "andamento"
  | "urgentes"
  | "historico"
  | "condominios"
  | "admin";
type AbaAdmin = "usuarios" | "accessLogs" | "actionLogs" | "notificationLogs";

type Condominio = {
  id: number;
  nome: string;
  endereco: string;
};

function ordenarCondominios(lista: Condominio[]) {
  return [...lista].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
  );
}

function normalizarBusca(valor: string) {
  return valor
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function CondominioCombobox({
  condominios,
  valor,
  onChange,
  placeholder = "Selecione o condomínio",
}: {
  condominios: Condominio[];
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
}) {
  const selecionado = condominios.find((item) => String(item.id) === valor);
  const listaId = useId();
  const nomeSelecionado = selecionado?.nome ?? "";
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState(false);
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const textoCampo = aberto ? busca : nomeSelecionado || busca;

  const termo = normalizarBusca(busca);
  const opcoes = termo
    ? condominios.filter((item) => normalizarBusca(item.nome).includes(termo))
    : condominios;

  function escolher(item: Condominio) {
    onChange(String(item.id));
    setBusca("");
    setAberto(false);
  }

  function confirmarOpcao() {
    const opcao = opcoes[Math.min(indiceAtivo, opcoes.length - 1)];
    if (opcao) {
      escolher(opcao);
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <input
          type="text"
          value={textoCampo}
          placeholder={placeholder}
          role="combobox"
          aria-controls={listaId}
          aria-expanded={aberto}
          autoComplete="off"
          onFocus={() => {
            setBusca("");
            setIndiceAtivo(0);
            setAberto(true);
          }}
          onChange={(event) => {
            const novoValor = event.target.value;
            setBusca(novoValor);
            setIndiceAtivo(0);
            setAberto(true);
            onChange("");
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setAberto(true);
              setIndiceAtivo((atual) =>
                Math.min(atual + 1, Math.max(opcoes.length - 1, 0))
              );
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              setIndiceAtivo((atual) => Math.max(atual - 1, 0));
            }

            if (event.key === "Enter" && aberto) {
              event.preventDefault();
              confirmarOpcao();
            }

            if (event.key === "Escape") {
              setAberto(false);
              setBusca("");
            }
          }}
          onBlur={() => {
            window.setTimeout(() => {
              const exato = condominios.find(
                (item) => normalizarBusca(item.nome) === normalizarBusca(busca)
              );
              const unicoResultado = termo && opcoes.length === 1 ? opcoes[0] : null;

              if (exato) {
                escolher(exato);
                return;
              }

              if (unicoResultado) {
                escolher(unicoResultado);
                return;
              }

              if (!valor) {
                setBusca("");
              }

              setAberto(false);
            }, 120);
          }}
          className="w-full rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2.5 pr-10 text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
        />

        <button
          type="button"
          title="Abrir lista de condomínios"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setAberto((atual) => !atual)}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-300 transition hover:text-white"
        >
          <svg
            className={`h-4 w-4 transition ${aberto ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="m6 9 6 6 6-6"
            />
          </svg>
        </button>
      </div>

      {aberto && (
        <div
          id={listaId}
          className="absolute z-40 mt-2 max-h-64 w-full overflow-auto rounded-lg border border-slate-700 bg-[#0B1220] p-1 shadow-2xl shadow-black/40"
        >
          {opcoes.length > 0 ? (
            opcoes.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  escolher(item);
                }}
                onMouseEnter={() => setIndiceAtivo(index)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                  index === indiceAtivo
                    ? "bg-blue-600 text-white"
                    : "text-slate-100 hover:bg-slate-800"
                }`}
              >
                <span>{item.nome}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-3 text-sm text-slate-400">
              Nenhum condomínio encontrado
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type Chamado = {
  id: number;
  titulo: string;
  descricao: string;
  descricao_resolucao?: string;
  condominio: number;
  condominio_nome?: string;
  criado_por_nome?: string;
  assumido_por_nome?: string;
  editado_por_nome?: string;
  urgente: boolean;
  imagem?: string | null;
  imagem_resolucao?: string | null;
  status: "aberto" | "andamento" | "resolvido";
  criado_em?: string;
  atualizado_em?: string;
  resolvido_em?: string | null;
  recebido_em?: string | null;
  visualizado_em?: string | null;
};

type UsuarioLogado = {
  id: number;
  username: string;
  perfil: "admin" | "monitoramento" | "tecnico";
  nome: string;
};

type UsuarioSistema = {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  perfil: "admin" | "monitoramento" | "tecnico";
};

type AccessLog = {
  id: number;
  username: string;
  perfil: string;
  ip?: string | null;
  user_agent: string;
  sucesso: boolean;
  criado_em: string;
};

type ActionLog = {
  id: number;
  usuario_nome?: string;
  perfil: string;
  acao: string;
  detalhe: string;
  ip?: string | null;
  criado_em: string;
};

type NotificationLog = {
  id: number;
  usuario?: number;
  usuario_nome?: string;
  chamado?: number;
  chamado_titulo?: string;
  condominio_nome?: string;
  evento: "enviado" | "recebido" | "aberto" | "falha";
  titulo: string;
  corpo: string;
  urgente: boolean;
  plataforma: string;
  modelo: string;
  fabricante: string;
  sistema: string;
  detalhe: string;
  criado_em: string;
};

function MenuIcon({
  tipo,
}: {
  tipo:
    | "plus"
    | "inbox"
    | "clock"
    | "alert"
    | "history"
    | "building"
    | "settings";
}) {
  const common = {
    className: "h-5 w-5 shrink-0",
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.8,
    viewBox: "0 0 24 24",
  };

  if (tipo === "plus") {
    return (
      <svg {...common}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  }

  if (tipo === "inbox") {
    return (
      <svg {...common}>
        <path d="M4 4h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
        <path d="M4 13h4l2 3h4l2-3h4" />
      </svg>
    );
  }

  if (tipo === "clock") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5l3 2" />
      </svg>
    );
  }

  if (tipo === "alert") {
    return (
      <svg {...common}>
        <path d="m12 3 10 18H2L12 3Z" />
        <path d="M12 9v4M12 17h.01" />
      </svg>
    );
  }

  if (tipo === "history") {
    return (
      <svg {...common}>
        <path d="M4 12a8 8 0 1 0 2.35-5.65" />
        <path d="M4 5v5h5" />
        <path d="M12 8v5l3 2" />
      </svg>
    );
  }

  if (tipo === "building") {
    return (
      <svg {...common}>
        <path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />
        <path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1" />
        <path d="M3 21h18" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .36 1.98l.04.04a2 2 0 1 1-2.82 2.82l-.04-.04a1.8 1.8 0 0 0-1.98-.36 1.8 1.8 0 0 0-1.08 1.65V21a2 2 0 1 1-4 0v-.06A1.8 1.8 0 0 0 8.8 19.3a1.8 1.8 0 0 0-1.98.36l-.04.04a2 2 0 1 1-2.82-2.82l.04-.04A1.8 1.8 0 0 0 4.36 15a1.8 1.8 0 0 0-1.65-1.08H2.65a2 2 0 1 1 0-4h.06A1.8 1.8 0 0 0 4.36 8.8a1.8 1.8 0 0 0-.36-1.98l-.04-.04a2 2 0 1 1 2.82-2.82l.04.04A1.8 1.8 0 0 0 8.8 4.36a1.8 1.8 0 0 0 1.08-1.65V2.65a2 2 0 1 1 4 0v.06A1.8 1.8 0 0 0 15 4.36a1.8 1.8 0 0 0 1.98-.36l.04-.04a2 2 0 1 1 2.82 2.82l-.04.04A1.8 1.8 0 0 0 19.4 8.8a1.8 1.8 0 0 0 1.65 1.08h.06a2 2 0 1 1 0 4h-.06A1.8 1.8 0 0 0 19.4 15Z" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg
      className="h-10 w-10 text-slate-400"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.6}
      viewBox="0 0 24 24"
    >
      <path d="M4 8a2 2 0 0 1 2-2h2l1.6-2h4.8L16 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
      <circle cx="12" cy="12.5" r="3.5" />
    </svg>
  );
}

function CampoObrigatorio() {
  return <span className="text-red-500">*</span>;
}

function MenuBadge({
  valor,
  cor = "bg-slate-600 text-white",
}: {
  valor: number;
  cor?: string;
}) {
  return (
    <span
      className={`ml-auto min-w-7 rounded-full px-2 py-0.5 text-center text-xs font-bold ${cor}`}
    >
      {valor}
    </span>
  );
}

function SidebarItem({
  ativo,
  icone,
  label,
  contador,
  corContador,
  onClick,
}: {
  ativo: boolean;
  icone: Parameters<typeof MenuIcon>[0]["tipo"];
  label: string;
  contador?: number;
  corContador?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 rounded-md border px-3 py-2.5 text-left text-sm font-semibold transition ${
        ativo
          ? "border-blue-400/60 bg-blue-500/10 text-white shadow-[0_0_0_1px_rgba(59,130,246,0.16),0_12px_28px_rgba(15,23,42,0.28)]"
          : "border-transparent text-slate-300 hover:border-slate-700/60 hover:bg-slate-800/70 hover:text-white"
      }`}
    >
      <MenuIcon tipo={icone} />
      <span>{label}</span>
      {typeof contador === "number" && (
        <MenuBadge valor={contador} cor={corContador} />
      )}
    </button>
  );
}

function chamadoEstaNoHistorico(chamado: Chamado) {
  if (chamado.status !== "resolvido") {
    return false;
  }

  if (!chamado.resolvido_em) {
    return true;
  }

  const dataResolucao = new Date(chamado.resolvido_em).getTime();
  const limite = Date.now() - DIAS_NO_HISTORICO * 24 * 60 * 60 * 1000;

  return dataResolucao >= limite;
}

function formatarData(data?: string | null) {
  if (!data) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(data));
}

function statusRecebimento(chamado: Chamado) {
  if (chamado.visualizado_em) {
    return `Visualizada em ${formatarData(chamado.visualizado_em)}`;
  }

  if (chamado.recebido_em) {
    return `Recebida em ${formatarData(chamado.recebido_em)}`;
  }

  return "Recebida pendente";
}

function escaparHtml(texto?: string | number | null) {
  return String(texto ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textoEventoNotificacao(evento: NotificationLog["evento"]) {
  const textos = {
    enviado: "Enviado",
    recebido: "Recebido no app",
    aberto: "Aberto pelo usuario",
    falha: "Falha",
  };

  return textos[evento] ?? evento;
}

function classeEventoNotificacao(evento: NotificationLog["evento"]) {
  if (evento === "recebido") {
    return "bg-emerald-500/20 text-emerald-300";
  }

  if (evento === "aberto") {
    return "bg-blue-500/20 text-blue-300";
  }

  if (evento === "falha") {
    return "bg-red-500/20 text-red-300";
  }

  return "bg-slate-500/20 text-slate-300";
}

function PasswordInput({
  value,
  onChange,
  placeholder,
  visivel,
  onToggle,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  visivel: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <input
        type={visivel ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-700 bg-[#0F172A] p-4 pr-12 text-white outline-none transition focus:border-emerald-500"
      />

      <button
        type="button"
        onClick={onToggle}
        title={visivel ? "Ocultar senha" : "Mostrar senha"}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          {visivel ? (
            <>
              <path d="M3 3l18 18" />
              <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
              <path d="M9.9 4.2A9.8 9.8 0 0 1 12 4c5 0 8.5 4.2 9.7 6a2.8 2.8 0 0 1 0 3.1 15.8 15.8 0 0 1-2.1 2.7" />
              <path d="M6.4 6.4A15.7 15.7 0 0 0 2.3 10a2.8 2.8 0 0 0 0 3.1C3.5 15 7 19 12 19a9.7 9.7 0 0 0 4.1-.9" />
            </>
          ) : (
            <>
              <path d="M2.3 10.9a2.8 2.8 0 0 0 0 2.2C3.5 15 7 19 12 19s8.5-4 9.7-5.9a2.8 2.8 0 0 0 0-2.2C20.5 9 17 5 12 5s-8.5 4-9.7 5.9Z" />
              <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
}

export default function Home() {
  const [logado, setLogado] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem("delta-logado") === "true"
  );
  const [token, setToken] = useState(
    () =>
      (typeof window !== "undefined" && localStorage.getItem("delta-token")) ||
      ""
  );
  const [usuarioLogado, setUsuarioLogado] = useState<UsuarioLogado | null>(
    () => {
      if (typeof window === "undefined") {
        return null;
      }

      const usuarioSalvo = localStorage.getItem("delta-user");

      return usuarioSalvo ? JSON.parse(usuarioSalvo) : null;
    }
  );
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erroLogin, setErroLogin] = useState("");
  const [mensagemPopup, setMensagemPopup] = useState("");
  const [melhorandoTexto, setMelhorandoTexto] = useState(false);
  const [menuUsuarioAberto, setMenuUsuarioAberto] = useState(false);
  const [modalSenhaAberto, setModalSenhaAberto] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenhaConta, setNovaSenhaConta] = useState("");
  const [confirmarNovaSenha, setConfirmarNovaSenha] = useState("");

  const [aba, setAba] = useState<Aba>("chamados");
  const [abaAdmin, setAbaAdmin] = useState<AbaAdmin>("usuarios");
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>(
    []
  );

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [condominio, setCondominio] = useState("");
  const [urgente, setUrgente] = useState(false);
  const [imagem, setImagem] = useState<File | null>(null);

  const [editandoChamadoId, setEditandoChamadoId] = useState<number | null>(
    null
  );
  const [edicaoTitulo, setEdicaoTitulo] = useState("");
  const [edicaoDescricao, setEdicaoDescricao] = useState("");
  const [edicaoCondominio, setEdicaoCondominio] = useState("");
  const [edicaoUrgente, setEdicaoUrgente] = useState(false);
  const [edicaoImagem, setEdicaoImagem] = useState<File | null>(null);
  const [edicaoRemoverImagem, setEdicaoRemoverImagem] = useState(false);
  const [resolvendoChamadoId, setResolvendoChamadoId] = useState<number | null>(
    null
  );
  const [descricaoResolucao, setDescricaoResolucao] = useState("");
  const [chamadosSelecionadosPdf, setChamadosSelecionadosPdf] = useState<
    number[]
  >([]);
  const [descricaoCopiadaId, setDescricaoCopiadaId] = useState<number | null>(
    null
  );

  const [nomeCondominio, setNomeCondominio] = useState("");
  const [enderecoCondominio, setEnderecoCondominio] = useState("");
  const [editandoCondominioId, setEditandoCondominioId] = useState<
    number | null
  >(null);
  const [edicaoCondominioNome, setEdicaoCondominioNome] = useState("");
  const [edicaoCondominioEndereco, setEdicaoCondominioEndereco] =
    useState("");

  const [novoUsuario, setNovoUsuario] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarNovaSenhaUsuario, setConfirmarNovaSenhaUsuario] =
    useState("");
  const [mostrarNovaSenhaUsuario, setMostrarNovaSenhaUsuario] =
    useState(false);
  const [
    mostrarConfirmarNovaSenhaUsuario,
    setMostrarConfirmarNovaSenhaUsuario,
  ] = useState(false);
  const [novoPerfil, setNovoPerfil] =
    useState<UsuarioSistema["perfil"]>("monitoramento");
  const [editandoUsuarioId, setEditandoUsuarioId] = useState<number | null>(
    null
  );
  const [edicaoUsuarioNome, setEdicaoUsuarioNome] = useState("");
  const [edicaoUsuarioPerfil, setEdicaoUsuarioPerfil] =
    useState<UsuarioSistema["perfil"]>("monitoramento");
  const [edicaoUsuarioAtivo, setEdicaoUsuarioAtivo] = useState(true);
  const [edicaoUsuarioSenha, setEdicaoUsuarioSenha] = useState("");
  const [edicaoUsuarioConfirmarSenha, setEdicaoUsuarioConfirmarSenha] =
    useState("");
  const [mostrarEdicaoUsuarioSenha, setMostrarEdicaoUsuarioSenha] =
    useState(false);
  const [
    mostrarEdicaoUsuarioConfirmarSenha,
    setMostrarEdicaoUsuarioConfirmarSenha,
  ] = useState(false);

  const chamadosAbertos = useMemo(
    () => chamados.filter((chamado) => chamado.status === "aberto"),
    [chamados]
  );

  const chamadosEmAtendimento = useMemo(
    () => chamados.filter((chamado) => chamado.status === "andamento"),
    [chamados]
  );

  const chamadosUrgentes = useMemo(
    () =>
      chamados.filter(
        (chamado) => chamado.urgente && chamado.status !== "resolvido"
      ),
    [chamados]
  );

  const chamadosResolvidos = useMemo(
    () => chamados.filter(chamadoEstaNoHistorico),
    [chamados]
  );
  const todosResolvidosSelecionados =
    chamadosResolvidos.length > 0 &&
    chamadosResolvidos.every((chamado) =>
      chamadosSelecionadosPdf.includes(chamado.id)
    );
  const linhasNotificacao = useMemo(() => {
    const usados = new Set<number>();
    const linhas: Array<{
      enviado: NotificationLog;
      recebido: NotificationLog | null;
      aberto: NotificationLog | null;
    }> = [];
    const mesmasNotificacoes = (
      origem: NotificationLog,
      candidato: NotificationLog
    ) =>
      origem.usuario === candidato.usuario &&
      origem.chamado === candidato.chamado;

    notificationLogs
      .filter((log) => log.evento === "enviado")
      .forEach((enviado) => {
        const recebidos = notificationLogs
          .filter(
            (log) =>
              log.evento === "recebido" &&
              mesmasNotificacoes(enviado, log) &&
              new Date(log.criado_em).getTime() >=
                new Date(enviado.criado_em).getTime()
          )
          .sort(
            (a, b) =>
              new Date(a.criado_em).getTime() -
              new Date(b.criado_em).getTime()
          );

        const abertos = notificationLogs
          .filter(
            (log) =>
              log.evento === "aberto" &&
              mesmasNotificacoes(enviado, log) &&
              new Date(log.criado_em).getTime() >=
                new Date(enviado.criado_em).getTime()
          )
          .sort(
            (a, b) =>
              new Date(a.criado_em).getTime() -
              new Date(b.criado_em).getTime()
          );

        const recebido = recebidos[0];
        const aberto = abertos[0];
        usados.add(enviado.id);

        if (recebido) {
          usados.add(recebido.id);
        }

        if (aberto) {
          usados.add(aberto.id);
        }

        linhas.push({ enviado, recebido: recebido || null, aberto: aberto || null });
      });

    notificationLogs.forEach((log) => {
      if (!usados.has(log.id)) {
        linhas.push({ enviado: log, recebido: null, aberto: null });
      }
    });

    return linhas.sort(
      (a, b) =>
        new Date(b.enviado.criado_em).getTime() -
        new Date(a.enviado.criado_em).getTime()
    );
  }, [notificationLogs]);

  const podeIniciarAtendimento =
    usuarioLogado?.perfil === "admin" || usuarioLogado?.perfil === "tecnico";

  function podeEditarChamado(chamado: Chamado) {
    if (usuarioLogado?.perfil === "admin") {
      return true;
    }

    if (usuarioLogado?.perfil === "monitoramento") {
      return chamado.status === "aberto";
    }

    return usuarioLogado?.perfil === "tecnico";
  }

  const podeGerenciarCondominios =
    usuarioLogado?.perfil === "admin" ||
    usuarioLogado?.perfil === "monitoramento";

  const podeExcluirCondominios = usuarioLogado?.perfil === "admin";

  const perfilLabel =
    usuarioLogado?.perfil === "admin"
      ? "Admin"
      : usuarioLogado?.perfil === "tecnico"
        ? "Tecnico"
        : "Monitoramento";
  const inicialUsuario = (usuarioLogado?.nome || usuarioLogado?.username || "U")
    .charAt(0)
    .toUpperCase();

  const imagemPreview = useMemo(
    () => (imagem ? URL.createObjectURL(imagem) : ""),
    [imagem]
  );

  const edicaoImagemPreview = useMemo(
    () => (edicaoImagem ? URL.createObjectURL(edicaoImagem) : ""),
    [edicaoImagem]
  );

  const authHeaders = useMemo(
    () => ({
      Authorization: `Token ${token}`,
    }),
    [token]
  );

  async function melhorarTexto(texto: string, contexto: string) {
    const textoLimpo = texto.trim();

    if (!textoLimpo) {
      return "";
    }

    setMelhorandoTexto(true);

    try {
      const response = await fetch(`${API_URL}/api/melhorar-texto/`, {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          texto: textoLimpo,
          contexto,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(
          data?.detail ||
            data?.erro ||
            "Nao foi possivel melhorar o texto com IA."
        );
      }

      const data = await response.json();
      return data.texto || textoLimpo;
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "Nao foi possivel melhorar o texto com IA."
      );
      return texto;
    } finally {
      setMelhorandoTexto(false);
    }
  }

  async function carregarChamados() {
    const response = await fetch(`${API_URL}/api/chamados/`, {
      cache: "no-store",
      headers: authHeaders,
    });
    const data = (await response.json()) as Chamado[];
    setChamados(marcarRecebidosDaLista(data));
  }

  async function marcarVisualizado(chamado: Chamado) {
    if (chamado.visualizado_em || usuarioLogado?.perfil !== "tecnico") {
      return;
    }

    const agora = new Date().toISOString();

    setChamados((listaAtual) =>
      listaAtual.map((item) =>
        item.id === chamado.id
          ? {
              ...item,
              recebido_em: item.recebido_em || agora,
              visualizado_em: agora,
            }
          : item
      )
    );

    await fetch(`${API_URL}/api/chamados/${chamado.id}/marcar-visualizado/`, {
      method: "POST",
      headers: authHeaders,
    }).catch(() => undefined);
  }

  const marcarRecebidosDaLista = useCallback((lista: Chamado[]) => {
    if (usuarioLogado?.perfil !== "tecnico") {
      return lista;
    }

    const agora = new Date().toISOString();

    lista
      .filter(
        (chamado) =>
          chamado.status !== "resolvido" &&
          !chamado.recebido_em
      )
      .forEach((chamado) => {
        fetch(`${API_URL}/api/chamados/${chamado.id}/marcar-recebido/`, {
          method: "POST",
          headers: authHeaders,
        }).catch(() => undefined);
      });

    return lista.map((chamado) =>
      chamado.status !== "resolvido" && !chamado.recebido_em
        ? { ...chamado, recebido_em: agora }
        : chamado
    );
  }, [authHeaders, usuarioLogado?.perfil]);

  async function carregarCondominios() {
    const response = await fetch(`${API_URL}/api/condominios/`, {
      cache: "no-store",
      headers: authHeaders,
    });
    const data = await response.json();
    setCondominios(ordenarCondominios(data));
  }

  async function carregarAdmin() {
    if (usuarioLogado?.perfil !== "admin") {
      return;
    }

    const [
      usuariosResponse,
      logsResponse,
      actionLogsResponse,
      notificationLogsResponse,
    ] =
      await Promise.all([
      fetch(`${API_URL}/api/usuarios/`, {
        cache: "no-store",
        headers: authHeaders,
      }),
      fetch(`${API_URL}/api/access-logs/`, {
        cache: "no-store",
        headers: authHeaders,
      }),
      fetch(`${API_URL}/api/action-logs/`, {
        cache: "no-store",
        headers: authHeaders,
      }),
      fetch(`${API_URL}/api/notification-logs/`, {
        cache: "no-store",
        headers: authHeaders,
      }),
    ]);

    if (usuariosResponse.ok) {
      setUsuarios(await usuariosResponse.json());
    }

    if (logsResponse.ok) {
      setAccessLogs((await logsResponse.json()).slice(0, 20));
    }

    if (actionLogsResponse.ok) {
      setActionLogs((await actionLogsResponse.json()).slice(0, 30));
    }

    if (notificationLogsResponse.ok) {
      setNotificationLogs((await notificationLogsResponse.json()).slice(0, 40));
    }
  }

  async function cadastrarCondominio() {
    if (!nomeCondominio || !enderecoCondominio) {
      alert("Preencha nome e endereço do condomínio");
      return;
    }

    const response = await fetch(`${API_URL}/api/condominios/`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nome: nomeCondominio,
        endereco: enderecoCondominio,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.log(data);
      alert("Erro ao cadastrar condomínio");
      return;
    }

    setCondominios((listaAtual) => [
      ...ordenarCondominios([
        data,
        ...listaAtual.filter((item) => item.id !== data.id),
      ]),
    ]);
    setNomeCondominio("");
    setEnderecoCondominio("");

    await carregarCondominios();

    alert("Condomínio cadastrado!");
  }

  function iniciarEdicaoCondominio(item: Condominio) {
    setEditandoCondominioId(item.id);
    setEdicaoCondominioNome(item.nome);
    setEdicaoCondominioEndereco(item.endereco);
  }

  function cancelarEdicaoCondominio() {
    setEditandoCondominioId(null);
    setEdicaoCondominioNome("");
    setEdicaoCondominioEndereco("");
  }

  async function salvarEdicaoCondominio(id: number) {
    if (!edicaoCondominioNome || !edicaoCondominioEndereco) {
      alert("Preencha nome e endereco do condominio");
      return;
    }

    const response = await fetch(`${API_URL}/api/condominios/${id}/`, {
      method: "PATCH",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nome: edicaoCondominioNome,
        endereco: edicaoCondominioEndereco,
      }),
    });

    if (!response.ok) {
      alert("Erro ao editar condominio");
      return;
    }

    cancelarEdicaoCondominio();
    await carregarCondominios();
    alert("Condominio atualizado!");
  }

  async function excluirCondominio(id: number) {
    const confirmado = confirm(
      "Excluir este condominio? Chamados vinculados tambem podem ser removidos."
    );

    if (!confirmado) {
      return;
    }

    const response = await fetch(`${API_URL}/api/condominios/${id}/`, {
      method: "DELETE",
      headers: authHeaders,
    });

    if (!response.ok) {
      alert("Erro ao excluir condominio");
      return;
    }

    if (editandoCondominioId === id) {
      cancelarEdicaoCondominio();
    }

    await Promise.all([carregarCondominios(), carregarChamados()]);
    alert("Condominio excluido!");
  }

  async function cadastrarUsuario() {
    if (!novoUsuario || !novaSenha || !confirmarNovaSenhaUsuario || !novoPerfil) {
      alert("Preencha usuario, senha, confirmacao e perfil");
      return;
    }

    if (novaSenha !== confirmarNovaSenhaUsuario) {
      alert("A senha e a confirmacao precisam ser iguais.");
      return;
    }

    const response = await fetch(`${API_URL}/api/usuarios/`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: novoUsuario,
        password: novaSenha,
        perfil: novoPerfil,
        is_active: true,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      console.log(data);
      alert("Erro ao criar usuário");
      return;
    }

    setNovoUsuario("");
    setNovaSenha("");
    setConfirmarNovaSenhaUsuario("");
    setMostrarNovaSenhaUsuario(false);
    setMostrarConfirmarNovaSenhaUsuario(false);
    setNovoPerfil("monitoramento");
    await carregarAdmin();
    alert("Usuário criado!");
  }

  function iniciarEdicaoUsuario(usuarioSistema: UsuarioSistema) {
    setEditandoUsuarioId(usuarioSistema.id);
    setEdicaoUsuarioNome(usuarioSistema.username);
    setEdicaoUsuarioPerfil(usuarioSistema.perfil);
    setEdicaoUsuarioAtivo(usuarioSistema.is_active);
    setEdicaoUsuarioSenha("");
    setEdicaoUsuarioConfirmarSenha("");
    setMostrarEdicaoUsuarioSenha(false);
    setMostrarEdicaoUsuarioConfirmarSenha(false);
  }

  function cancelarEdicaoUsuario() {
    setEditandoUsuarioId(null);
    setEdicaoUsuarioNome("");
    setEdicaoUsuarioPerfil("monitoramento");
    setEdicaoUsuarioAtivo(true);
    setEdicaoUsuarioSenha("");
    setEdicaoUsuarioConfirmarSenha("");
    setMostrarEdicaoUsuarioSenha(false);
    setMostrarEdicaoUsuarioConfirmarSenha(false);
  }

  async function salvarUsuario(id: number) {
    if (!edicaoUsuarioNome || !edicaoUsuarioPerfil) {
      alert("Preencha usuário e perfil");
      return;
    }

    const response = await fetch(`${API_URL}/api/usuarios/${id}/`, {
      method: "PATCH",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: edicaoUsuarioNome,
        perfil: edicaoUsuarioPerfil,
        is_active: edicaoUsuarioAtivo,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      console.log(data);
      alert("Erro ao editar usuário");
      return;
    }

    if (edicaoUsuarioSenha || edicaoUsuarioConfirmarSenha) {
      if (!edicaoUsuarioSenha || !edicaoUsuarioConfirmarSenha) {
        alert("Para trocar a senha, preencha a nova senha e a confirmacao.");
        return;
      }

      if (edicaoUsuarioSenha !== edicaoUsuarioConfirmarSenha) {
        alert("A nova senha e a confirmacao precisam ser iguais.");
        return;
      }

      const senhaResponse = await fetch(
        `${API_URL}/api/usuarios/${id}/senha/`,
        {
          method: "POST",
          headers: {
            ...authHeaders,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password: edicaoUsuarioSenha,
          }),
        }
      );

      if (!senhaResponse.ok) {
        const data = await senhaResponse.json();
        console.log(data);
        alert("Usuário salvo, mas houve erro ao trocar a senha");
        return;
      }
    }

    cancelarEdicaoUsuario();
    await carregarAdmin();
    alert("Usuário atualizado!");
  }

  async function excluirUsuario(usuarioSistema: UsuarioSistema) {
    if (usuarioSistema.id === usuarioLogado?.id) {
      alert("Você não pode excluir o usuário logado.");
      return;
    }

    const confirmou = confirm(
      `Excluir o usuário ${usuarioSistema.username}? Essa ação não pode ser desfeita.`
    );

    if (!confirmou) {
      return;
    }

    const response = await fetch(
      `${API_URL}/api/usuarios/${usuarioSistema.id}/`,
      {
        method: "DELETE",
        headers: authHeaders,
      }
    );

    if (!response.ok) {
      alert("Erro ao excluir usuário");
      return;
    }

    await carregarAdmin();
  }

  async function criarChamado() {
    if (!titulo || !descricao || !condominio) {
      alert("Preencha todos os campos");
      return;
    }

    const formData = new FormData();

    formData.append("titulo", titulo);
    formData.append("descricao", descricao);
    formData.append("condominio", condominio);
    formData.append("urgente", urgente ? "true" : "false");
    formData.append("status", "aberto");

    if (imagem) {
      formData.append("imagem", imagem);
    }

    const response = await fetch(`${API_URL}/api/chamados/`, {
      method: "POST",
      headers: authHeaders,
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json();
      console.log(data);
      alert("Erro ao criar chamado");
      return;
    }

    setTitulo("");
    setDescricao("");
    setCondominio("");
    setUrgente(false);
    setImagem(null);

    await carregarChamados();
    setMensagemPopup("Chamado aberto com sucesso");
    setAba("abertos");
  }

  function abrirResolucao(chamado: Chamado) {
    setResolvendoChamadoId(chamado.id);
    setDescricaoResolucao(chamado.descricao_resolucao || "");
  }

  function cancelarResolucao() {
    setResolvendoChamadoId(null);
    setDescricaoResolucao("");
  }

  async function resolverChamado() {
    if (!resolvendoChamadoId || !descricaoResolucao.trim()) {
      alert("Informe o que foi feito antes de resolver.");
      return;
    }

    const response = await fetch(`${API_URL}/api/chamados/${resolvendoChamadoId}/`, {
      method: "PATCH",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "resolvido",
        descricao_resolucao: descricaoResolucao.trim(),
      }),
    });

    if (!response.ok) {
      alert("Erro ao resolver chamado.");
      return;
    }

    cancelarResolucao();
    carregarChamados();
  }

  function alternarSelecaoPdf(id: number) {
    setChamadosSelecionadosPdf((selecionados) =>
      selecionados.includes(id)
        ? selecionados.filter((item) => item !== id)
        : [...selecionados, id]
    );
  }

  function alternarTodosResolvidosPdf() {
    if (todosResolvidosSelecionados) {
      setChamadosSelecionadosPdf([]);
      return;
    }

    setChamadosSelecionadosPdf(chamadosResolvidos.map((chamado) => chamado.id));
  }

  function exportarResolvidosPdf() {
    const chamadosParaExportar = chamadosResolvidos.filter((chamado) =>
      chamadosSelecionadosPdf.includes(chamado.id)
    );

    if (chamadosParaExportar.length === 0) {
      alert("Selecione pelo menos um chamado resolvido para exportar.");
      return;
    }

    const janela = window.open("", "_blank", "width=900,height=700");

    if (!janela) {
      alert("O navegador bloqueou a janela do PDF. Permita pop-ups e tente novamente.");
      return;
    }

    const cards = chamadosParaExportar
      .map(
        (chamado) => `
          <article class="card">
            <div class="card-header">
              <div>
                <span class="label">Chamado #${escaparHtml(chamado.id)}</span>
                <h2>${escaparHtml(chamado.titulo)}</h2>
              </div>
              <span class="status">${chamado.urgente ? "Urgente" : "Normal"}</span>
            </div>
            <p class="descricao">${escaparHtml(chamado.descricao)}</p>
            <dl>
              <div><dt>Condominio</dt><dd>${escaparHtml(chamado.condominio_nome || chamado.condominio)}</dd></div>
              <div><dt>Aberto por</dt><dd>${escaparHtml(chamado.criado_por_nome || "nao informado")}</dd></div>
              <div><dt>Aberto em</dt><dd>${escaparHtml(formatarData(chamado.criado_em))}</dd></div>
              <div><dt>Status de leitura</dt><dd>${escaparHtml(statusRecebimento(chamado))}</dd></div>
              <div><dt>Editado por</dt><dd>${escaparHtml(chamado.editado_por_nome || "Nao editado")}</dd></div>
              <div><dt>Ultima edicao</dt><dd>${escaparHtml(chamado.editado_por_nome ? formatarData(chamado.atualizado_em) : "Nao editado")}</dd></div>
              <div><dt>Resolvido em</dt><dd>${escaparHtml(formatarData(chamado.resolvido_em))}</dd></div>
              <div><dt>Feito</dt><dd>${escaparHtml(chamado.descricao_resolucao || "Nao informado")}</dd></div>
              <div><dt>Foto da resolucao</dt><dd>${escaparHtml(chamado.imagem_resolucao ? "sim" : "nao")}</dd></div>
            </dl>
          </article>
        `
      )
      .join("");

    janela.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Relatorio de Chamados Resolvidos</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 32px;
              color: #111827;
              font-family: Arial, sans-serif;
              background: #ffffff;
            }
            header {
              border-bottom: 2px solid #0f172a;
              margin-bottom: 24px;
              padding-bottom: 16px;
            }
            h1 { margin: 0; font-size: 26px; }
            .subtitle { margin-top: 6px; color: #475569; }
            .card {
              break-inside: avoid;
              border: 1px solid #cbd5e1;
              border-radius: 10px;
              margin-bottom: 18px;
              padding: 18px;
            }
            .card-header {
              align-items: flex-start;
              display: flex;
              gap: 16px;
              justify-content: space-between;
            }
            .label {
              color: #64748b;
              display: block;
              font-size: 12px;
              font-weight: 700;
              letter-spacing: .06em;
              margin-bottom: 6px;
              text-transform: uppercase;
            }
            h2 { font-size: 20px; margin: 0; }
            .status {
              border: 1px solid #cbd5e1;
              border-radius: 999px;
              font-size: 12px;
              font-weight: 700;
              padding: 6px 10px;
              text-transform: uppercase;
            }
            .descricao {
              margin: 14px 0 18px;
              white-space: pre-wrap;
            }
            dl {
              display: grid;
              gap: 10px;
              margin: 0;
            }
            dt {
              color: #64748b;
              font-size: 12px;
              font-weight: 700;
              text-transform: uppercase;
            }
            dd {
              margin: 3px 0 0;
              white-space: pre-wrap;
            }
            @media print {
              body { padding: 18mm; }
              .card { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <header>
            <h1>Delta Chamados - Resolvidos</h1>
            <p class="subtitle">${chamadosParaExportar.length} chamado(s) exportado(s) em ${escaparHtml(formatarData(new Date().toISOString()))}</p>
          </header>
          ${cards}
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    janela.document.close();
  }

  async function copiarDescricaoResolucao(chamado: Chamado) {
    if (!chamado.descricao_resolucao) {
      return;
    }

    try {
      await navigator.clipboard.writeText(chamado.descricao_resolucao);
    } catch {
      const campoTemporario = document.createElement("textarea");
      campoTemporario.value = chamado.descricao_resolucao;
      document.body.appendChild(campoTemporario);
      campoTemporario.select();
      document.execCommand("copy");
      campoTemporario.remove();
    }

    setDescricaoCopiadaId(chamado.id);
    window.setTimeout(() => setDescricaoCopiadaId(null), 1400);
  }

  function textoCompartilhamentoChamado(chamado: Chamado) {
    return [
      "Delta Chamados",
      `Condominio: ${chamado.condominio_nome || chamado.condominio}`,
      `Chamado: ${chamado.titulo}`,
      `Descricao: ${chamado.descricao}`,
      chamado.descricao_resolucao
        ? `Feito: ${chamado.descricao_resolucao}`
        : "",
      chamado.imagem_resolucao
        ? `Foto da resolucao: ${chamado.imagem_resolucao}`
        : "",
      chamado.criado_em ? `Aberto em: ${formatarData(chamado.criado_em)}` : "",
      chamado.resolvido_em
        ? `Resolvido em: ${formatarData(chamado.resolvido_em)}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  function compartilharWhatsApp(
    event: MouseEvent<HTMLButtonElement>,
    chamado: Chamado
  ) {
    event.stopPropagation();
    window.open(
      `https://wa.me/?text=${encodeURIComponent(
        textoCompartilhamentoChamado(chamado)
      )}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function compartilharEmail(
    event: MouseEvent<HTMLButtonElement>,
    chamado: Chamado
  ) {
    event.stopPropagation();
    const assunto = `Delta Chamados - ${
      chamado.condominio_nome || chamado.titulo
    }`;
    window.location.href = `mailto:?subject=${encodeURIComponent(
      assunto
    )}&body=${encodeURIComponent(textoCompartilhamentoChamado(chamado))}`;
  }

  async function iniciarAtendimento(id: number) {
    await fetch(`${API_URL}/api/chamados/${id}/`, {
      method: "PATCH",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "andamento",
      }),
    });

    carregarChamados();
  }

  function iniciarEdicao(chamado: Chamado) {
    setEditandoChamadoId(chamado.id);
    setEdicaoTitulo(chamado.titulo);
    setEdicaoDescricao(chamado.descricao);
    setEdicaoCondominio(String(chamado.condominio));
    setEdicaoUrgente(chamado.urgente);
    setEdicaoImagem(null);
    setEdicaoRemoverImagem(false);
  }

  function cancelarEdicao() {
    setEditandoChamadoId(null);
    setEdicaoTitulo("");
    setEdicaoDescricao("");
    setEdicaoCondominio("");
    setEdicaoUrgente(false);
    setEdicaoImagem(null);
    setEdicaoRemoverImagem(false);
  }

  async function salvarEdicaoChamado(id: number) {
    if (!edicaoTitulo || !edicaoDescricao || !edicaoCondominio) {
      alert("Preencha todos os campos");
      return;
    }

    if (edicaoImagem) {
      const formData = new FormData();

      formData.append("titulo", edicaoTitulo);
      formData.append("descricao", edicaoDescricao);
      formData.append("condominio", edicaoCondominio);
      formData.append("urgente", edicaoUrgente ? "true" : "false");
      formData.append("imagem", edicaoImagem);

      const response = await fetch(`${API_URL}/api/chamados/${id}/`, {
        method: "PATCH",
        headers: authHeaders,
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        console.log(data);
        alert("Erro ao editar chamado");
        return;
      }
    } else {
      const response = await fetch(`${API_URL}/api/chamados/${id}/`, {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          titulo: edicaoTitulo,
          descricao: edicaoDescricao,
          condominio: Number(edicaoCondominio),
          urgente: edicaoUrgente,
          ...(edicaoRemoverImagem ? { imagem: null } : {}),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        console.log(data);
        alert("Erro ao editar chamado");
        return;
      }
    }

    cancelarEdicao();
    await carregarChamados();
  }

  async function entrar() {
    const response = await fetch(`${API_URL}/api/login/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: usuario,
        password: senha,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      setErroLogin(data.detail || "Usuário ou senha inválidos.");
      return;
    }

    localStorage.setItem("delta-logado", "true");
    localStorage.setItem("delta-token", data.token);
    localStorage.setItem("delta-user", JSON.stringify(data.user));
    setToken(data.token);
    setUsuarioLogado(data.user);
    setAba("chamados");
    setAbaAdmin("usuarios");
    setMenuUsuarioAberto(false);
    setLogado(true);
    setErroLogin("");
    setSenha("");
  }

  function sair() {
    setMenuUsuarioAberto(false);
    setModalSenhaAberto(false);
    localStorage.removeItem("delta-logado");
    localStorage.removeItem("delta-token");
    localStorage.removeItem("delta-user");
    setLogado(false);
    setToken("");
    setUsuarioLogado(null);
    setUsuario("");
    setSenha("");
    setErroLogin("");
    setAba("chamados");
    setAbaAdmin("usuarios");
  }

  function abrirModalSenha() {
    setMenuUsuarioAberto(false);
    setSenhaAtual("");
    setNovaSenhaConta("");
    setConfirmarNovaSenha("");
    setModalSenhaAberto(true);
  }

  function fecharModalSenha() {
    setModalSenhaAberto(false);
    setSenhaAtual("");
    setNovaSenhaConta("");
    setConfirmarNovaSenha("");
  }

  async function alterarMinhaSenha() {
    if (!senhaAtual || !novaSenhaConta || !confirmarNovaSenha) {
      alert("Preencha a senha atual, a nova senha e a confirmacao.");
      return;
    }

    if (novaSenhaConta !== confirmarNovaSenha) {
      alert("A nova senha e a confirmacao precisam ser iguais.");
      return;
    }

    const response = await fetch(`${API_URL}/api/minha-senha/`, {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        senha_atual: senhaAtual,
        nova_senha: novaSenhaConta,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.detail || "Nao foi possivel alterar a senha.");
      return;
    }

    fecharModalSenha();
    alert("Senha alterada com sucesso.");
  }

  useEffect(() => {
    return () => {
      if (imagemPreview) {
        URL.revokeObjectURL(imagemPreview);
      }
    };
  }, [imagemPreview]);

  useEffect(() => {
    return () => {
      if (edicaoImagemPreview) {
        URL.revokeObjectURL(edicaoImagemPreview);
      }
    };
  }, [edicaoImagemPreview]);

  useEffect(() => {
    if (!mensagemPopup) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setMensagemPopup("");
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [mensagemPopup]);

  useEffect(() => {
    if (!logado || !token) {
      return;
    }

    let ativo = true;

    async function carregarDados() {
      const [listaChamados, listaCondominios] = await Promise.all([
        fetch(`${API_URL}/api/chamados/`, {
          cache: "no-store",
          headers: authHeaders,
        }).then((response) => response.json()),
        fetch(`${API_URL}/api/condominios/`, {
          cache: "no-store",
          headers: authHeaders,
        }).then((response) => response.json()),
      ]);

      if (ativo) {
        setChamados(marcarRecebidosDaLista(listaChamados));
        setCondominios(ordenarCondominios(listaCondominios));
      }
    }

    function atualizarQuandoVoltar() {
      if (document.visibilityState === "visible") {
        carregarDados().catch(() => undefined);
      }
    }

    carregarDados().catch(() => undefined);
    const intervalo = window.setInterval(() => {
      fetch(`${API_URL}/api/chamados/`, {
        cache: "no-store",
        headers: authHeaders,
      })
        .then((response) => response.json())
        .then((listaChamados) => {
          if (ativo) {
            setChamados(marcarRecebidosDaLista(listaChamados));
          }
        })
        .catch(() => undefined);
    }, 5000);

    window.addEventListener("focus", atualizarQuandoVoltar);
    document.addEventListener("visibilitychange", atualizarQuandoVoltar);

    return () => {
      ativo = false;
      window.clearInterval(intervalo);
      window.removeEventListener("focus", atualizarQuandoVoltar);
      document.removeEventListener("visibilitychange", atualizarQuandoVoltar);
    };
  }, [authHeaders, logado, marcarRecebidosDaLista, token, usuarioLogado?.perfil]);

  if (!logado) {
    return (
      <main className="min-h-screen bg-[#0B111D] p-4 text-white sm:p-6">
        <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-[28px] border border-slate-700/50 bg-[#111827] shadow-2xl shadow-black/40 sm:min-h-[calc(100vh-3rem)] lg:grid-cols-[1.05fr_0.95fr]">
          <section className="flex items-center bg-[#1F2937]/70 px-6 py-10 sm:px-10 lg:px-16">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black shadow-lg shadow-black/40">
                  <span className="h-0 w-0 border-x-[9px] border-b-[16px] border-x-transparent border-b-white" />
                </div>

                <p className="text-xl font-semibold tracking-tight">
                  Delta Chamados
                </p>
              </div>

              <div className="mb-7">
                <h1 className="mb-3 text-3xl font-bold leading-tight sm:text-4xl">
                  Acesso ao painel
                </h1>

                <p className="max-w-sm text-sm leading-6 text-slate-400">
                  Entre para acompanhar chamados, condomínios e atendimentos em
                  andamento.
                </p>
              </div>

              <div className="rounded-lg border border-slate-600/60 bg-[#162131]/90 p-5 shadow-2xl shadow-black/30 backdrop-blur">
                <div className="grid gap-4">
                  <label className="grid gap-2 text-xs font-medium text-slate-300">
                    Usuário
                    <input
                      type="text"
                      value={usuario}
                      onChange={(event) => setUsuario(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          entrar();
                        }
                      }}
                      className="rounded-md border border-slate-600 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500"
                      placeholder="Digite seu usuário"
                    />
                  </label>

                  <label className="grid gap-2 text-xs font-medium text-slate-300">
                    Senha
                    <input
                      type="password"
                      value={senha}
                      onChange={(event) => setSenha(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          entrar();
                        }
                      }}
                      className="rounded-md border border-slate-600 bg-[#0F172A] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-500"
                      placeholder="Digite sua senha"
                    />
                  </label>

                  {erroLogin && (
                    <p className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {erroLogin}
                    </p>
                  )}

                  <button
                    onClick={entrar}
                    className="rounded-md bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
                  >
                    Entrar
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="relative hidden overflow-hidden border-l border-slate-800 bg-[#0F172A] lg:block">
            <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(120deg,rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(210deg,rgba(148,163,184,0.08)_1px,transparent_1px)] [background-size:80px_80px,110px_110px]" />

            <div className="relative flex h-full flex-col justify-between p-12">
              <div>
                <h2 className="max-w-sm text-3xl font-bold leading-tight">
                  Organização simples para a rotina técnica dos condomínios.
                </h2>
              </div>

              <div className="absolute right-[-72px] top-28 w-[390px] rotate-[-13deg] rounded-[18px] border border-slate-600/50 bg-[#111827]/90 p-5 shadow-2xl shadow-black/50">
                <div className="mb-5 flex items-center justify-between">
                  <div className="h-3 w-28 rounded-full bg-slate-600" />
                  <div className="h-8 w-8 rounded-full border border-emerald-400/50" />
                </div>
                <div className="grid grid-cols-[100px_1fr] gap-4">
                  <div className="grid gap-3">
                    <div className="h-9 rounded-md bg-slate-700/80" />
                    <div className="h-9 rounded-md bg-slate-800" />
                    <div className="h-9 rounded-md bg-slate-800" />
                    <div className="h-9 rounded-md bg-slate-800" />
                  </div>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="h-20 rounded-md border border-slate-600 bg-slate-800/80" />
                      <div className="h-20 rounded-md border border-slate-600 bg-slate-800/80" />
                      <div className="h-20 rounded-md border border-slate-600 bg-slate-800/80" />
                    </div>
                    <div className="h-28 rounded-md border border-slate-600 bg-slate-800/80 p-4">
                      <div className="mb-4 h-3 w-28 rounded-full bg-slate-600" />
                      <div className="h-12 rounded-md border border-emerald-400/40 bg-emerald-500/10" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative z-10 grid gap-4">
                <div className="max-w-md rounded-lg border border-slate-600/60 bg-slate-700/40 p-4 shadow-xl shadow-black/20 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-600/80 text-emerald-300">
                      <MenuIcon tipo="clock" />
                    </div>
                    <p className="text-sm leading-5 text-slate-100">
                      Acompanhe chamados, vistorias e manutenções em tempo real.
                    </p>
                  </div>
                </div>

                <div className="max-w-md rounded-lg border border-slate-600/60 bg-slate-700/40 p-4 shadow-xl shadow-black/20 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-600/80 text-blue-300">
                      <MenuIcon tipo="building" />
                    </div>
                    <p className="text-sm leading-5 text-slate-100">
                      Gestão completa de condomínios e equipes técnicas em um só
                      lugar.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0F172A] text-white">
      {mensagemPopup && (
        <div className="fixed left-1/2 top-5 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-green-500/40 bg-green-950/95 px-5 py-4 text-center font-semibold text-green-100 shadow-2xl shadow-black/40">
          {mensagemPopup}
        </div>
      )}

      {modalSenhaAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-700/70 bg-[#1F2937] p-6 shadow-2xl">
            <h2 className="mb-2 text-2xl font-semibold">Alterar senha</h2>
            <p className="mb-5 text-sm text-slate-400">
              Informe sua senha atual e escolha uma nova senha.
            </p>

            <div className="grid gap-4">
              <input
                type="password"
                placeholder="Senha atual"
                value={senhaAtual}
                onChange={(event) => setSenhaAtual(event.target.value)}
                className="rounded-md border border-slate-700 bg-[#0F172A] p-4 text-white outline-none transition focus:border-emerald-500"
              />

              <input
                type="password"
                placeholder="Nova senha"
                value={novaSenhaConta}
                onChange={(event) => setNovaSenhaConta(event.target.value)}
                className="rounded-md border border-slate-700 bg-[#0F172A] p-4 text-white outline-none transition focus:border-emerald-500"
              />

              <input
                type="password"
                placeholder="Confirmar nova senha"
                value={confirmarNovaSenha}
                onChange={(event) => setConfirmarNovaSenha(event.target.value)}
                className="rounded-md border border-slate-700 bg-[#0F172A] p-4 text-white outline-none transition focus:border-emerald-500"
              />

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={alterarMinhaSenha}
                  className="rounded-md bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-500"
                >
                  Salvar senha
                </button>

                <button
                  onClick={fecharModalSenha}
                  className="rounded-md border border-slate-600 px-5 py-3 font-medium text-slate-300 transition hover:border-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {resolvendoChamadoId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-lg rounded-lg border border-slate-700/70 bg-[#1F2937] p-6 shadow-2xl">
            <h2 className="mb-3 text-2xl font-semibold">Resolver chamado</h2>
            <p className="mb-4 text-sm text-slate-400">
              Descreva brevemente o que foi feito no atendimento.
            </p>

            <textarea
              value={descricaoResolucao}
              onChange={(event) => setDescricaoResolucao(event.target.value)}
              placeholder="Ex: Foi realizada a troca da lampada e testado o funcionamento."
              className="min-h-32 w-full rounded-md border border-slate-700 bg-[#0F172A] p-4 text-white outline-none transition focus:border-emerald-500"
            />

            <div className="mt-4 flex flex-wrap gap-3">
              <button
                disabled={melhorandoTexto}
                onClick={async () =>
                  setDescricaoResolucao(
                    await melhorarTexto(descricaoResolucao, "resolucao")
                  )
                }
                className="rounded-md border border-blue-500/60 px-5 py-3 font-medium text-blue-200 transition hover:border-blue-300 hover:text-white"
              >
                {melhorandoTexto ? "..." : "Melhorar texto"}
              </button>

              <button
                onClick={resolverChamado}
                className="rounded-md bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700"
              >
                Marcar como resolvido
              </button>

              <button
                onClick={cancelarResolucao}
                className="rounded-md border border-slate-600 px-5 py-3 font-medium text-slate-300 transition hover:border-slate-400 hover:text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="border-b border-slate-800 bg-[#111827] p-5 lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r lg:p-4">
          <div className="mb-8 flex items-center justify-between gap-4 px-2 pt-2">
            <div className="flex h-14 w-52 items-center">
              <Image
                src="/delta-condominios-logo.png"
                alt="Delta Condomínios"
                width={340}
                height={72}
                priority
                className="h-auto w-full object-contain"
              />
            </div>

            <button
              onClick={sair}
              className="rounded-md border border-slate-600 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-400 hover:text-white lg:hidden"
            >
              Sair
            </button>
          </div>

          <div className="grid gap-6">
            <div>
              <p className="mb-2 px-3 text-xs font-semibold text-slate-400">
                Monitoramento
              </p>

              <div className="grid gap-1">
                <SidebarItem
                  ativo={aba === "chamados"}
                  icone="plus"
                  label="Abrir Chamado"
                  onClick={() => setAba("chamados")}
                />

                <SidebarItem
                  ativo={aba === "abertos"}
                  icone="inbox"
                  label="Em Aberto"
                  contador={chamadosAbertos.length}
                  corContador="bg-emerald-500 text-white"
                  onClick={() => setAba("abertos")}
                />

                <SidebarItem
                  ativo={aba === "andamento"}
                  icone="clock"
                  label="Em Andamento"
                  contador={chamadosEmAtendimento.length}
                  corContador="bg-blue-500 text-white"
                  onClick={() => setAba("andamento")}
                />

                <SidebarItem
                  ativo={aba === "urgentes"}
                  icone="alert"
                  label="Urgentes"
                  contador={chamadosUrgentes.length}
                  corContador="bg-red-500 text-white"
                  onClick={() => setAba("urgentes")}
                />

                <SidebarItem
                  ativo={aba === "historico"}
                  icone="history"
                  label="Resolvidos"
                  contador={chamadosResolvidos.length}
                  corContador="bg-emerald-600 text-white"
                  onClick={() => setAba("historico")}
                />
              </div>
            </div>

            <div className="border-t border-slate-800 pt-5">
              <p className="mb-2 px-3 text-xs font-semibold text-slate-400">
                Gerenciamento
              </p>

              <div className="grid gap-1">
                <SidebarItem
                  ativo={aba === "condominios"}
                  icone="building"
                  label="Condomínios"
                  contador={condominios.length}
                  corContador="bg-slate-600 text-white"
                  onClick={() => setAba("condominios")}
                />

                {usuarioLogado?.perfil === "admin" && (
                  <SidebarItem
                    ativo={aba === "admin"}
                    icone="settings"
                    label="Administração"
                    onClick={() => {
                      setAba("admin");
                      carregarAdmin();
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </aside>

        <div className="flex-1 bg-[#0F172A] p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="mb-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Delta Chamados
                </h1>
                <p className="text-sm text-slate-400">
                  Gestão técnica de ocorrências
                  {usuarioLogado && ` - ${usuarioLogado.perfil}`}
                </p>
              </div>

              <div
                className="relative hidden lg:block"
                onMouseEnter={() => setMenuUsuarioAberto(true)}
                onMouseLeave={() => setMenuUsuarioAberto(false)}
              >
                <button
                  type="button"
                  onClick={() =>
                    setMenuUsuarioAberto((menuAberto) => !menuAberto)
                  }
                  className="flex items-center gap-2 rounded-md border border-blue-400/45 bg-blue-600/15 px-3 py-2 text-left shadow-lg shadow-black/10 transition hover:border-blue-300 hover:bg-blue-500/20"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-blue-700">
                    <svg
                      aria-hidden="true"
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 12c2.2 0 4-1.8 4-4s-1.8-4-4-4-4 1.8-4 4 1.8 4 4 4Zm0 2c-3.3 0-6 1.8-6 4v1h12v-1c0-2.2-2.7-4-6-4Z" />
                    </svg>
                  </span>

                  <span>
                    <span className="block text-xs font-semibold text-white">
                      {perfilLabel} [{inicialUsuario}]
                    </span>
                    <span className="block max-w-28 truncate text-[11px] text-blue-100/75">
                      {usuarioLogado?.username}
                    </span>
                  </span>
                </button>

                <div
                  className={`absolute right-0 top-[calc(100%-1px)] z-20 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#1F2937]/85 text-white shadow-2xl shadow-black/40 backdrop-blur-xl transition ${
                    menuUsuarioAberto
                      ? "visible translate-y-0 opacity-100"
                      : "invisible -translate-y-1 opacity-0"
                  }`}
                >
                  <div className="border-b border-white/10 px-5 py-4">
                    <p className="text-sm font-bold tracking-tight text-white">
                      {usuarioLogado?.username}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold uppercase text-slate-300">
                      {perfilLabel}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={abrirModalSenha}
                    className="flex w-full items-center gap-3 px-5 py-4 text-left text-sm font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5 text-slate-300"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 17v.01" />
                      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                      <rect height="10" rx="2" width="14" x="5" y="11" />
                    </svg>
                    Alterar Senha
                  </button>

                  <button
                    onClick={sair}
                    className="flex w-full items-center gap-3 border-t border-white/10 bg-white/5 px-5 py-4 text-left text-sm font-bold text-slate-200 transition hover:bg-white/10 hover:text-white"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-5 w-5 text-slate-300"
                      fill="none"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      viewBox="0 0 24 24"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                      <path d="m16 17 5-5-5-5" />
                      <path d="M21 12H9" />
                    </svg>
                    Sair
                  </button>
                </div>
              </div>
            </div>

            {aba === "condominios" && (
              <>
                {podeGerenciarCondominios && (
                <div className="mb-8 rounded-lg border border-slate-700/70 bg-[#1F2937] p-6 shadow-2xl">
                  <h2 className="mb-5 text-2xl font-semibold">
                    Cadastrar Condomínio
                  </h2>

                  <div className="grid gap-4">
                    <input
                      type="text"
                      placeholder="Nome do condomínio"
                      value={nomeCondominio}
                      onChange={(event) =>
                        setNomeCondominio(event.target.value)
                      }
                      className="rounded-md border border-slate-700 bg-[#0F172A] p-4 text-white outline-none transition focus:border-emerald-500"
                    />

                    <input
                      type="text"
                      placeholder="Endereço"
                      value={enderecoCondominio}
                      onChange={(event) =>
                        setEnderecoCondominio(event.target.value)
                      }
                      className="rounded-md border border-slate-700 bg-[#0F172A] p-4 text-white outline-none transition focus:border-emerald-500"
                    />

                    <button
                      onClick={cadastrarCondominio}
                      className="rounded-md bg-emerald-600 p-4 font-semibold text-white transition hover:bg-emerald-500"
                    >
                      Cadastrar Condomínio
                    </button>
                  </div>
                </div>
                )}

                <div className="grid gap-5">
                  {condominios.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-slate-700/70 bg-[#1F2937] p-6 shadow-xl"
                    >
                      {editandoCondominioId === item.id ? (
                        <div className="grid gap-4">
                          <input
                            type="text"
                            value={edicaoCondominioNome}
                            onChange={(event) =>
                              setEdicaoCondominioNome(event.target.value)
                            }
                            className="rounded-md border border-slate-700 bg-[#0F172A] p-4 text-white outline-none transition focus:border-emerald-500"
                          />

                          <input
                            type="text"
                            value={edicaoCondominioEndereco}
                            onChange={(event) =>
                              setEdicaoCondominioEndereco(event.target.value)
                            }
                            className="rounded-md border border-slate-700 bg-[#0F172A] p-4 text-white outline-none transition focus:border-emerald-500"
                          />

                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={() => salvarEdicaoCondominio(item.id)}
                              className="rounded-md bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-500"
                            >
                              Salvar
                            </button>

                            <button
                              onClick={cancelarEdicaoCondominio}
                              className="rounded-md border border-slate-600 px-5 py-3 font-medium text-slate-300 transition hover:border-slate-400 hover:text-white"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h2 className="mb-2 text-2xl font-semibold">
                                {item.nome}
                              </h2>

                              <p className="text-slate-400">{item.endereco}</p>
                            </div>

                            {podeGerenciarCondominios && (
                              <div className="flex flex-wrap gap-3">
                                <button
                                  onClick={() =>
                                    iniciarEdicaoCondominio(item)
                                  }
                                  className="rounded-md border border-slate-600 px-5 py-3 font-medium text-slate-300 transition hover:border-slate-400 hover:text-white"
                                >
                                  Editar
                                </button>

                                {podeExcluirCondominios && (
                                  <button
                                    onClick={() => excluirCondominio(item.id)}
                                    className="rounded-md border border-red-900 px-5 py-3 font-medium text-red-300 transition hover:border-red-500 hover:text-red-100"
                                  >
                                    Excluir
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {aba === "admin" && usuarioLogado?.perfil === "admin" && (
              <div className="grid gap-8">
                <div>
                  <h2 className="mb-5 text-2xl font-semibold">
                    Administração
                  </h2>

                  <div className="grid gap-3 sm:grid-cols-4">
                    <button
                      onClick={() => {
                        setAbaAdmin("usuarios");
                        carregarAdmin();
                      }}
                      className={`rounded-md p-3 text-left font-semibold transition ${
                        abaAdmin === "usuarios"
                          ? "bg-white text-black"
                          : "bg-[#1F2937] text-slate-200 hover:bg-slate-700"
                      }`}
                    >
                      Usuários
                    </button>

                    <button
                      onClick={() => {
                        setAbaAdmin("accessLogs");
                        carregarAdmin();
                      }}
                      className={`rounded-md p-3 text-left font-semibold transition ${
                        abaAdmin === "accessLogs"
                          ? "bg-white text-black"
                          : "bg-[#1F2937] text-slate-200 hover:bg-slate-700"
                      }`}
                    >
                      Logs de acesso
                    </button>

                    <button
                      onClick={() => {
                        setAbaAdmin("actionLogs");
                        carregarAdmin();
                      }}
                      className={`rounded-md p-3 text-left font-semibold transition ${
                        abaAdmin === "actionLogs"
                          ? "bg-white text-black"
                          : "bg-[#1F2937] text-slate-200 hover:bg-slate-700"
                      }`}
                    >
                      Logs gerais
                    </button>

                    <button
                      onClick={() => {
                        setAbaAdmin("notificationLogs");
                        carregarAdmin();
                      }}
                      className={`rounded-md p-3 text-left font-semibold transition ${
                        abaAdmin === "notificationLogs"
                          ? "bg-white text-black"
                          : "bg-[#1F2937] text-slate-200 hover:bg-slate-700"
                      }`}
                    >
                      Logs de notificacao
                    </button>
                  </div>
                </div>

                {abaAdmin === "usuarios" && (
                  <>
                    <div className="rounded-lg border border-slate-700/70 bg-[#1F2937] p-6 shadow-2xl">
                      <h2 className="mb-5 text-2xl font-semibold">
                        Criar usuário
                      </h2>

                      <div className="grid gap-4 xl:grid-cols-[1fr_1fr_1fr_200px_auto]">
                        <input
                          type="text"
                          placeholder="Usuário"
                          value={novoUsuario}
                          onChange={(event) =>
                            setNovoUsuario(event.target.value)
                          }
                          className="rounded-md border border-slate-700 bg-[#0F172A] p-4 text-white outline-none transition focus:border-emerald-500"
                        />

                        <PasswordInput
                          placeholder="Senha"
                          value={novaSenha}
                          onChange={setNovaSenha}
                          visivel={mostrarNovaSenhaUsuario}
                          onToggle={() =>
                            setMostrarNovaSenhaUsuario((mostrar) => !mostrar)
                          }
                        />

                        <PasswordInput
                          placeholder="Confirmar senha"
                          value={confirmarNovaSenhaUsuario}
                          onChange={setConfirmarNovaSenhaUsuario}
                          visivel={mostrarConfirmarNovaSenhaUsuario}
                          onToggle={() =>
                            setMostrarConfirmarNovaSenhaUsuario(
                              (mostrar) => !mostrar
                            )
                          }
                        />

                        <select
                          value={novoPerfil}
                          onChange={(event) =>
                            setNovoPerfil(
                              event.target.value as UsuarioSistema["perfil"]
                            )
                          }
                          className="rounded-md border border-slate-700 bg-[#0F172A] p-4 text-white outline-none transition focus:border-emerald-500"
                        >
                          <option value="admin">Admin</option>
                          <option value="monitoramento">Monitoramento</option>
                          <option value="tecnico">Técnico</option>
                        </select>

                        <button
                          onClick={cadastrarUsuario}
                          className="rounded-md bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-500"
                        >
                          Criar
                        </button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-700/70 bg-[#1F2937] p-6 shadow-xl">
                      <h2 className="mb-5 text-2xl font-semibold">
                        Usuários
                      </h2>

                      <div className="grid gap-3">
                        {usuarios.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-md border border-slate-700 bg-[#0F172A] p-4"
                          >
                            {editandoUsuarioId === item.id ? (
                              <div className="grid gap-4">
                                <div className="grid gap-4 md:grid-cols-[1fr_220px_160px]">
                                  <input
                                    type="text"
                                    value={edicaoUsuarioNome}
                                    onChange={(event) =>
                                      setEdicaoUsuarioNome(event.target.value)
                                    }
                                    className="rounded-md border border-slate-700 bg-[#0F172A] p-4 text-white outline-none transition focus:border-emerald-500"
                                  />

                                  <select
                                    value={edicaoUsuarioPerfil}
                                    onChange={(event) =>
                                      setEdicaoUsuarioPerfil(
                                        event.target
                                          .value as UsuarioSistema["perfil"]
                                      )
                                    }
                                    className="rounded-md border border-slate-700 bg-[#0F172A] p-4 text-white outline-none transition focus:border-emerald-500"
                                  >
                                    <option value="admin">Admin</option>
                                    <option value="monitoramento">
                                      Monitoramento
                                    </option>
                                    <option value="tecnico">Técnico</option>
                                  </select>

                                  <label className="flex items-center gap-3 rounded-md border border-slate-700 bg-[#0F172A] p-4 text-white">
                                    <input
                                      type="checkbox"
                                      checked={edicaoUsuarioAtivo}
                                      onChange={(event) =>
                                        setEdicaoUsuarioAtivo(
                                          event.target.checked
                                        )
                                      }
                                      className="h-5 w-5"
                                    />
                                    <span>Ativo</span>
                                  </label>
                                </div>

                                <div className="grid gap-4 md:grid-cols-2">
                                  <PasswordInput
                                    placeholder="Nova senha, deixe em branco para manter"
                                    value={edicaoUsuarioSenha}
                                    onChange={setEdicaoUsuarioSenha}
                                    visivel={mostrarEdicaoUsuarioSenha}
                                    onToggle={() =>
                                      setMostrarEdicaoUsuarioSenha(
                                        (mostrar) => !mostrar
                                      )
                                    }
                                  />

                                  <PasswordInput
                                    placeholder="Confirmar nova senha"
                                    value={edicaoUsuarioConfirmarSenha}
                                    onChange={setEdicaoUsuarioConfirmarSenha}
                                    visivel={
                                      mostrarEdicaoUsuarioConfirmarSenha
                                    }
                                    onToggle={() =>
                                      setMostrarEdicaoUsuarioConfirmarSenha(
                                        (mostrar) => !mostrar
                                      )
                                    }
                                  />
                                </div>

                                <div className="flex flex-wrap gap-3">
                                  <button
                                    onClick={() => salvarUsuario(item.id)}
                                    className="rounded-md bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-500"
                                  >
                                    Salvar
                                  </button>

                                  <button
                                    onClick={cancelarEdicaoUsuario}
                                    className="rounded-md border border-slate-600 px-5 py-3 font-medium text-slate-300 transition hover:border-slate-400 hover:text-white"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="font-semibold">
                                    {item.username}
                                  </p>
                                  <p className="text-sm text-slate-400">
                                    {item.perfil} -{" "}
                                    {item.is_active ? "ativo" : "inativo"}
                                  </p>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                  <button
                                    onClick={() => iniciarEdicaoUsuario(item)}
                                    className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-400 hover:text-white"
                                  >
                                    Editar
                                  </button>

                                  <button
                                    onClick={() => excluirUsuario(item)}
                                    className="rounded-md border border-red-500/50 px-4 py-2 text-sm font-medium text-red-200 transition hover:border-red-300 hover:text-red-100"
                                  >
                                    Excluir
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {abaAdmin === "actionLogs" && (
                  <div className="rounded-lg border border-slate-700/70 bg-[#1F2937] p-6 shadow-xl">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h2 className="text-2xl font-semibold">
                        Logs gerais
                      </h2>

                      <button
                        onClick={carregarAdmin}
                        className="rounded-md border border-slate-600 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-400 hover:text-white"
                      >
                        Atualizar
                      </button>
                    </div>

                      <div className="grid gap-3">
                        {actionLogs.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-md border border-slate-700 bg-[#0F172A] p-4"
                          >
                            <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <p className="font-semibold">
                                {item.usuario_nome || "sistema"}
                              </p>
                              <span className="rounded-full bg-blue-500/20 px-3 py-1 text-sm font-medium text-blue-300">
                                {item.acao}
                              </span>
                            </div>

                            <pre className="whitespace-pre-wrap rounded-md border border-slate-700 bg-black/20 p-3 text-sm leading-6 text-slate-200">
                              {item.detalhe || "Sem detalhe"}
                            </pre>

                            <p className="mt-2 text-sm text-slate-400">
                              {formatarData(item.criado_em)} - IP:{" "}
                              {item.ip || "nao identificado"} - {item.perfil}
                            </p>
                          </div>
                        ))}

                        {actionLogs.length === 0 && (
                          <p className="rounded-md border border-slate-700 bg-[#0F172A] p-4 text-sm text-slate-400">
                            Nenhuma alteracao registrada.
                          </p>
                        )}
                      </div>
                  </div>
                )}

                {abaAdmin === "notificationLogs" && (
                  <div className="rounded-lg border border-slate-700/70 bg-[#1F2937] p-6 shadow-xl">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h2 className="text-2xl font-semibold">
                        Logs de notificacao
                      </h2>

                      <button
                        onClick={carregarAdmin}
                        className="rounded-md border border-slate-600 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-400 hover:text-white"
                      >
                        Atualizar
                      </button>
                    </div>

                    <div className="grid gap-3">
                      {linhasNotificacao.map(({ enviado, recebido, aberto }) => (
                        <div
                          key={enviado.id}
                          className="rounded-md border border-slate-700 bg-[#0F172A] p-4"
                        >
                          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="font-semibold">
                                {enviado.usuario_nome || "sem usuario"}
                              </p>
                              <p className="text-sm text-slate-400">
                                {enviado.condominio_nome || "sem condominio"}
                                {enviado.chamado_titulo
                                  ? ` - ${enviado.chamado_titulo}`
                                  : ""}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {enviado.urgente && (
                                <span className="rounded-full bg-red-500/20 px-3 py-1 text-sm font-medium text-red-300">
                                  urgente
                                </span>
                              )}

                              <span
                                className={`rounded-full px-3 py-1 text-sm font-medium ${classeEventoNotificacao(
                                  recebido ? "recebido" : enviado.evento
                                )}`}
                              >
                                {recebido
                                  ? "Recebido"
                                  : textoEventoNotificacao(enviado.evento)}
                              </span>
                            </div>
                          </div>

                          <p className="text-sm text-slate-300">
                            {enviado.titulo || "Notificacao"}{" "}
                            {enviado.corpo ? `- ${enviado.corpo}` : ""}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-400">
                            <span>
                              Enviada {formatarData(enviado.criado_em)}
                            </span>

                            <span
                              className={
                                recebido
                                  ? "text-emerald-300"
                                  : "text-yellow-300"
                              }
                            >
                              Recebida{" "}
                              {recebido
                                ? formatarData(recebido.criado_em)
                                : "pendente"}
                            </span>

                            {aberto && (
                              <span className="text-blue-300">
                                Aberta {formatarData(aberto.criado_em)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}

                      {linhasNotificacao.length === 0 && (
                        <p className="rounded-md border border-slate-700 bg-[#0F172A] p-4 text-sm text-slate-400">
                          Nenhuma notificacao registrada.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {abaAdmin === "accessLogs" && (
                  <div className="rounded-lg border border-slate-700/70 bg-[#1F2937] p-6 shadow-xl">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h2 className="text-2xl font-semibold">
                        Logs de acesso
                      </h2>

                      <button
                        onClick={carregarAdmin}
                        className="rounded-md border border-slate-600 px-4 py-3 text-sm font-medium text-slate-300 transition hover:border-slate-400 hover:text-white"
                      >
                        Atualizar
                      </button>
                    </div>
                      <div className="grid gap-3">
                        {accessLogs.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-md border border-slate-700 bg-[#0F172A] p-4"
                          >
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <p className="font-semibold">{item.username}</p>
                              <span
                                className={`rounded-full px-3 py-1 text-sm font-medium ${
                                  item.sucesso
                                    ? "bg-green-500/20 text-green-300"
                                    : "bg-red-500/20 text-red-300"
                                }`}
                              >
                                {item.sucesso ? "sucesso" : "falha"}
                              </span>
                            </div>

                            <p className="mt-2 text-sm text-slate-400">
                              {formatarData(item.criado_em)} - IP:{" "}
                              {item.ip || "nao identificado"} - {item.perfil}
                            </p>
                          </div>
                        ))}
                      </div>
                  </div>
                )}
              </div>
            )}

            {aba === "chamados" && (
                  <div className="mb-6 rounded-lg border border-slate-700/70 bg-[#1F2937] p-5 shadow-2xl">
                    <h2 className="mb-4 text-lg font-semibold">
                      Novo Chamado
                    </h2>

                    <div className="grid gap-4">
                      <label className="grid gap-2 text-sm font-medium text-slate-300">
                        Titulo do Chamado
                        <input
                        type="text"
                        placeholder="Título"
                        value={titulo}
                        onChange={(event) => setTitulo(event.target.value)}
                        className="rounded-lg border border-slate-700 bg-[#0F172A] px-3 py-2.5 text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                      />
                      </label>

                      <label className="grid gap-2 text-sm font-medium text-slate-300">
                        <span>
                          Descricao Detalhada <CampoObrigatorio />
                        </span>
                      <div className="relative">
                        <textarea
                        placeholder="Descrição"
                        value={descricao}
                        onChange={(event) => setDescricao(event.target.value)}
                        spellCheck
                        className="min-h-24 w-full rounded-lg border border-slate-700 bg-[#0F172A] p-3 pr-16 text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                      />

                        <button
                          type="button"
                          title="Corrigir e melhorar texto"
                          disabled={melhorandoTexto}
                          onClick={async () =>
                            setDescricao(
                              await melhorarTexto(descricao, "novo chamado")
                            )
                          }
                          className="absolute bottom-3 right-3 rounded-md border border-blue-500/60 bg-[#0F172A] px-3 py-2 text-sm font-bold text-blue-200 transition hover:border-blue-300 hover:text-white"
                        >
                          {melhorandoTexto ? "..." : "Aa"}
                        </button>
                      </div>
                      </label>

                      <label className="grid gap-2 text-sm font-medium text-slate-300">
                        <span>
                          Selecione o Condominio <CampoObrigatorio />
                        </span>
                        <CondominioCombobox
                          condominios={condominios}
                          valor={condominio}
                          onChange={setCondominio}
                        />
                      </label>

                      <label className="flex items-center gap-3 rounded-lg border border-slate-700 bg-[#0F172A] px-4 py-3 text-white transition hover:border-slate-600">
                        <input
                          type="checkbox"
                          checked={urgente}
                          onChange={(event) =>
                            setUrgente(event.target.checked)
                          }
                          className="h-5 w-5 rounded accent-emerald-500"
                        />

                        <span>Este chamado é urgente</span>
                      </label>

                      <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-500 bg-[#0F172A] p-5 text-center text-white transition hover:border-slate-300">
                        <CameraIcon />

                        <span className="font-medium">
                          Arraste e solte ou clique para adicionar uma foto
                        </span>

                        <span className="text-sm text-slate-400">
                          (PNG, JPG, JPEG)
                        </span>

                        <input
                          type="file"
                          accept="image/*"
                          onChange={(event) => {
                            if (event.target.files && event.target.files[0]) {
                              setImagem(event.target.files[0]);
                            } else {
                              setImagem(null);
                            }
                          }}
                          className="hidden"
                        />
                      </label>

                      {imagem && (
                        <div className="rounded-lg border border-slate-700 bg-[#0F172A] p-4">
                          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-slate-400">
                              Imagem selecionada:{" "}
                              <span className="text-slate-200">
                                {imagem.name}
                              </span>
                            </p>

                            <button
                              type="button"
                              onClick={() => setImagem(null)}
                              className="rounded-md border border-slate-600 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-red-400 hover:text-red-200"
                            >
                              Remover foto
                            </button>
                          </div>

                          {imagemPreview && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imagemPreview}
                              alt="Prévia da imagem selecionada"
                              className="max-h-80 w-full rounded-md border border-slate-700 object-contain"
                            />
                          )}
                        </div>
                      )}

                      <button
                        onClick={criarChamado}
                        className="rounded-lg bg-emerald-600 p-4 font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition hover:bg-emerald-500 active:scale-[0.98]"
                      >
                        Criar Chamado
                      </button>
                    </div>
                  </div>
            )}

            {(aba === "abertos" ||
              aba === "andamento" ||
              aba === "urgentes" ||
              aba === "historico") && (
                <div className="grid gap-5">
                  {aba === "historico" && (
                    <div className="rounded-lg border border-slate-700/70 bg-[#1F2937]/80 p-4 shadow-xl">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <button
                          type="button"
                          onClick={alternarTodosResolvidosPdf}
                          className={`inline-flex items-center gap-3 rounded-md border px-4 py-3 text-sm font-semibold transition ${
                            todosResolvidosSelecionados
                              ? "border-emerald-400/70 bg-emerald-500/15 text-emerald-100"
                              : "border-slate-700 bg-[#0F172A] text-slate-300 hover:border-slate-500 hover:text-white"
                          }`}
                        >
                          <span
                            className={`h-5 w-5 rounded border ${
                              todosResolvidosSelecionados
                                ? "border-emerald-300 bg-emerald-500"
                                : "border-slate-500 bg-slate-900"
                            }`}
                          />
                          <span>
                            {todosResolvidosSelecionados
                              ? "Todos selecionados"
                              : "Selecionar todos"}{" "}
                            ({chamadosSelecionadosPdf.length})
                          </span>
                        </button>

                        <div className="flex flex-col gap-2 sm:items-end">
                          <button
                            onClick={exportarResolvidosPdf}
                            className="rounded-md bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition hover:bg-emerald-500 active:scale-[0.98]"
                          >
                            Exportar PDF
                          </button>
                          <span className="text-xs text-slate-400">
                            Selecione os cards que entram no relatorio
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {chamados
                    .filter((chamado) =>
                      aba === "historico"
                        ? chamadoEstaNoHistorico(chamado)
                        : aba === "andamento"
                          ? chamado.status === "andamento"
                          : aba === "urgentes"
                            ? chamado.urgente && chamado.status !== "resolvido"
                          : chamado.status === "aberto"
                    )
                    .map((chamado) => (
                      <div
                        key={chamado.id}
                        title={`Aberto por: ${chamado.criado_por_nome || "nao informado"}`}
                        onClick={() => marcarVisualizado(chamado)}
                        className={`relative rounded-lg border border-l-4 bg-[#1F2937] p-4 shadow-lg transition ${
                          aba === "historico" &&
                          chamadosSelecionadosPdf.includes(chamado.id)
                            ? "border-emerald-400/70 shadow-[0_0_0_1px_rgba(16,185,129,0.18),0_20px_40px_rgba(15,23,42,0.35)]"
                            : chamado.urgente
                              ? "border-slate-700/70 border-l-red-400/80"
                              : "border-slate-700/70 border-l-slate-600/70"
                        } ${aba === "historico" ? "pb-4" : ""} ${
                          usuarioLogado?.perfil === "tecnico"
                            ? "cursor-pointer"
                            : ""
                        }`}
                      >
                        {editandoChamadoId === chamado.id ? (
                          <div className="grid gap-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <h2 className="text-2xl font-semibold">
                                Editar chamado
                              </h2>

                              <span className="rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300">
                                #{chamado.id}
                              </span>
                            </div>

                            <input
                              type="text"
                              placeholder="Título"
                              value={edicaoTitulo}
                              onChange={(event) =>
                                setEdicaoTitulo(event.target.value)
                              }
                              className="rounded-md border border-slate-700 bg-[#0F172A] p-4 text-white outline-none transition focus:border-emerald-500"
                            />

                            <textarea
                              placeholder="Descrição"
                              value={edicaoDescricao}
                              onChange={(event) =>
                                setEdicaoDescricao(event.target.value)
                              }
                              className="min-h-28 rounded-md border border-slate-700 bg-[#0F172A] p-4 text-white outline-none transition focus:border-emerald-500"
                            />

                            <CondominioCombobox
                              condominios={condominios}
                              valor={edicaoCondominio}
                              onChange={setEdicaoCondominio}
                            />

                            <label className="flex items-center gap-3 rounded-md border border-slate-700 bg-[#0F172A] p-4 text-white">
                              <input
                                type="checkbox"
                                checked={edicaoUrgente}
                                onChange={(event) =>
                                  setEdicaoUrgente(event.target.checked)
                                }
                                className="h-5 w-5"
                              />

                              <span>Este chamado é urgente</span>
                            </label>

                            {chamado.imagem &&
                              !edicaoImagem &&
                              !edicaoRemoverImagem && (
                                <div className="rounded-lg border border-slate-700 bg-[#0F172A] p-4">
                                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm text-slate-400">
                                      Foto atual
                                    </p>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEdicaoRemoverImagem(true)
                                      }
                                      className="rounded-md border border-slate-600 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-red-400 hover:text-red-200"
                                    >
                                      Remover foto atual
                                    </button>
                                  </div>

                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={chamado.imagem}
                                    alt="Foto atual do chamado"
                                    className="max-h-80 w-full rounded-md border border-slate-700 object-contain"
                                  />
                                </div>
                              )}

                            {edicaoRemoverImagem && !edicaoImagem && (
                              <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                A foto atual será removida ao salvar.
                              </p>
                            )}

                            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-500 bg-[#0F172A] p-6 text-white transition hover:border-slate-300">
                              <span className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                                Foto
                              </span>

                              <span className="font-semibold">
                                Clique aqui para trocar a foto
                              </span>

                              <span className="text-sm text-slate-400">
                                PNG, JPG ou JPEG
                              </span>

                              <input
                                type="file"
                                accept="image/*"
                                onChange={(event) => {
                                  if (
                                    event.target.files &&
                                    event.target.files[0]
                                  ) {
                                    setEdicaoImagem(event.target.files[0]);
                                    setEdicaoRemoverImagem(false);
                                  } else {
                                    setEdicaoImagem(null);
                                  }
                                }}
                                className="hidden"
                              />
                            </label>

                            {edicaoImagem && (
                              <div className="rounded-lg border border-slate-700 bg-[#0F172A] p-4">
                                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <p className="text-sm text-slate-400">
                                    Nova imagem:{" "}
                                    <span className="text-slate-200">
                                      {edicaoImagem.name}
                                    </span>
                                  </p>

                                  <button
                                    type="button"
                                    onClick={() => setEdicaoImagem(null)}
                                    className="rounded-md border border-slate-600 px-3 py-2 text-sm font-medium text-slate-300 transition hover:border-red-400 hover:text-red-200"
                                  >
                                    Remover troca
                                  </button>
                                </div>

                                {edicaoImagemPreview && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={edicaoImagemPreview}
                                    alt="Prévia da nova imagem"
                                    className="max-h-80 w-full rounded-md border border-slate-700 object-contain"
                                  />
                                )}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-3">
                              <button
                                onClick={() =>
                                  salvarEdicaoChamado(chamado.id)
                                }
                                className="rounded-md bg-emerald-600 px-5 py-3 font-semibold text-white transition hover:bg-emerald-500"
                              >
                                Salvar alterações
                              </button>

                              <button
                                onClick={cancelarEdicao}
                                className="rounded-md border border-slate-600 px-5 py-3 font-medium text-slate-300 transition hover:border-slate-400 hover:text-white"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <h2 className="text-lg font-semibold uppercase tracking-wide text-white sm:text-xl">
                              {chamado.condominio_nome || chamado.condominio}
                            </h2>

                            <p className="mt-1 text-sm font-medium text-slate-300">
                              {chamado.titulo}
                            </p>
                          </div>

                          <div className="flex shrink-0 flex-wrap gap-2">
                            {chamado.urgente && (
                              <span className="rounded-full border border-red-400/25 bg-red-500/15 px-2.5 py-1 text-[11px] font-semibold text-red-300">
                                Urgente
                              </span>
                            )}

                            <span
                              className={`
                              rounded-full border px-2.5 py-1 text-[11px] font-semibold
                              ${
                                chamado.status === "aberto"
                                  ? "border-yellow-400/20 bg-yellow-500/15 text-yellow-300"
                                  : ""
                              }
                              ${
                                chamado.status === "andamento"
                                  ? "border-blue-400/20 bg-blue-500/15 text-blue-300"
                                  : ""
                              }
                              ${
                                chamado.status === "resolvido"
                                  ? "border-emerald-400/20 bg-emerald-500/15 text-emerald-300"
                                  : ""
                              }
                            `}
                            >
                              {chamado.status}
                            </span>
                          </div>
                        </div>

                        <p className="mb-3 text-sm leading-5 text-slate-200">
                          {chamado.descricao}
                        </p>

                        {chamado.status === "resolvido" &&
                          chamado.descricao_resolucao && (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                copiarDescricaoResolucao(chamado);
                              }}
                              className="mb-3 block w-full rounded-lg border border-emerald-300/25 bg-emerald-400/12 px-3 py-2.5 text-left text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-emerald-300/60 hover:bg-emerald-400/15"
                              title="Clique para copiar o texto feito pelo tecnico"
                            >
                              <span className="mb-1 flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-wide text-emerald-300">
                                <span>Feito</span>
                                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-emerald-200">
                                  {descricaoCopiadaId === chamado.id
                                    ? "Copiado"
                                    : "Copiar"}
                                </span>
                              </span>
                              <span className="block text-sm leading-5">
                                {chamado.descricao_resolucao}
                              </span>
                            </button>
                          )}

                        {chamado.status === "resolvido" &&
                          chamado.imagem_resolucao && (
                            <a
                              href={chamado.imagem_resolucao}
                              target="_blank"
                              rel="noreferrer"
                              className="mb-3 block rounded-lg border border-emerald-300/20 bg-[#0F172A] p-2"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={chamado.imagem_resolucao}
                                alt="Foto da resolucao"
                                className="max-h-64 w-full rounded-md object-contain"
                              />
                            </a>
                          )}

                        {chamado.imagem && (
                          <a
                            href={chamado.imagem}
                            target="_blank"
                            rel="noreferrer"
                            className="mb-4 block rounded-lg border border-slate-700 bg-[#0F172A] p-2"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={chamado.imagem}
                              alt="Imagem do chamado"
                              className="max-h-64 w-full rounded-md object-contain"
                            />
                          </a>
                        )}

                        <div className="mt-4 flex flex-col gap-3 border-t border-slate-700/60 pt-2 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] leading-5 text-slate-400">
                            <span>
                              Aberto por{" "}
                              <strong className="font-semibold text-slate-300">
                                {chamado.criado_por_nome || "nao informado"}
                              </strong>{" "}
                              em {formatarData(chamado.criado_em)}
                            </span>

                            {chamado.assumido_por_nome && (
                              <span className="text-blue-300">
                                Assumido por{" "}
                                <strong>{chamado.assumido_por_nome}</strong>
                              </span>
                            )}

                            {chamado.status === "resolvido" &&
                              chamado.resolvido_em && (
                                <span>
                                  Resolvido em{" "}
                                  {formatarData(chamado.resolvido_em)}
                                </span>
                              )}

                          </div>

                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {podeEditarChamado(chamado) && (
                              <button
                                onClick={() => iniciarEdicao(chamado)}
                                title="Editar chamado"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-600 text-slate-300 transition hover:border-slate-400 hover:bg-slate-800/70 hover:text-white"
                              >
                                <svg
                                  className="h-5 w-5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="1.8"
                                  viewBox="0 0 24 24"
                                >
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
                                </svg>
                              </button>
                            )}

                            {chamado.status === "resolvido" && (
                              <>
                                <button
                                  type="button"
                                  onClick={(event) =>
                                    compartilharWhatsApp(event, chamado)
                                  }
                                  title="Compartilhar no WhatsApp"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-600 text-slate-300 transition hover:border-emerald-400/70 hover:bg-emerald-500/10 hover:text-emerald-200"
                                >
                                  <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.8"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M12 20a8 8 0 1 0-7-4.1L4 21l5.2-1.3A8 8 0 0 0 12 20Z" />
                                    <path d="M8.8 9.1c.2 3 2.1 5 5 5.7l1.4-1.4-2-1-1 1c-1-.4-1.8-1.2-2.2-2.2l1-1-1-2-1.2.9Z" />
                                  </svg>
                                </button>

                                <button
                                  type="button"
                                  onClick={(event) =>
                                    compartilharEmail(event, chamado)
                                  }
                                  title="Compartilhar por email"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-600 text-slate-300 transition hover:border-blue-400/70 hover:bg-blue-500/10 hover:text-blue-200"
                                >
                                  <svg
                                    className="h-5 w-5"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="1.8"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M4 6h16v12H4Z" />
                                    <path d="m4 7 8 6 8-6" />
                                  </svg>
                                </button>
                              </>
                            )}

                            {aba === "historico" && (
                              <button
                                type="button"
                                onClick={() => alternarSelecaoPdf(chamado.id)}
                                className={`inline-flex h-9 w-9 items-center justify-center rounded-md border transition ${
                                  chamadosSelecionadosPdf.includes(chamado.id)
                                    ? "border-emerald-400 bg-emerald-500/20 text-emerald-100 shadow-[0_0_0_3px_rgba(16,185,129,0.10)]"
                                    : "border-slate-600 bg-[#0F172A]/60 text-slate-300 hover:border-emerald-400/70 hover:text-white"
                                }`}
                                title="Selecionar para exportar"
                                aria-label="Selecionar chamado para exportar"
                              >
                                <span
                                  className={`flex h-4 w-4 items-center justify-center rounded border ${
                                    chamadosSelecionadosPdf.includes(
                                      chamado.id
                                    )
                                      ? "border-emerald-300 bg-emerald-500"
                                      : "border-slate-500"
                                  }`}
                                />
                              </button>
                            )}

                            {chamado.status === "aberto" &&
                              podeIniciarAtendimento && (
                              <button
                                onClick={() =>
                                  iniciarAtendimento(chamado.id)
                                }
                                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-500"
                              >
                                Iniciar atendimento
                              </button>
                            )}

                            {chamado.status === "andamento" && (
                              <button
                                onClick={() => abrirResolucao(chamado)}
                                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
                              >
                                Marcar como resolvido
                              </button>
                            )}
                          </div>
                        </div>

                        {aba === "historico" && (
                          <button
                            type="button"
                            onClick={() => alternarSelecaoPdf(chamado.id)}
                            className={`hidden ${
                              chamadosSelecionadosPdf.includes(chamado.id)
                                ? "border-emerald-400 bg-emerald-500/20 text-emerald-100 shadow-[0_0_0_3px_rgba(16,185,129,0.10)]"
                                : "border-slate-600 bg-[#0F172A]/95 text-slate-300 hover:border-emerald-400/70 hover:text-white"
                            }`}
                            title="Selecionar para exportar"
                            aria-label="Selecionar chamado para exportar"
                          >
                            <span
                              className={`flex h-4 w-4 items-center justify-center rounded border text-[10px] ${
                                chamadosSelecionadosPdf.includes(chamado.id)
                                  ? "border-emerald-300 bg-emerald-500"
                                  : "border-slate-500"
                              }`}
                            >
                              {chamadosSelecionadosPdf.includes(chamado.id)
                                ? "✓"
                                : ""}
                            </span>
                          </button>
                        )}
                          </>
                        )}
                      </div>
                    ))}
                </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
