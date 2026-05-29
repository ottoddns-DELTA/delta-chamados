"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://delta-chamados-production.up.railway.app";

const DIAS_NO_HISTORICO = 30;

type Aba = "chamados" | "andamento" | "historico" | "condominios" | "admin";
type AbaAdmin = "usuarios" | "logs";

type Condominio = {
  id: number;
  nome: string;
  endereco: string;
};

type Chamado = {
  id: number;
  titulo: string;
  descricao: string;
  condominio: number;
  condominio_nome?: string;
  criado_por_nome?: string;
  urgente: boolean;
  imagem?: string | null;
  status: "aberto" | "andamento" | "resolvido";
  criado_em?: string;
  atualizado_em?: string;
  resolvido_em?: string | null;
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

  const [aba, setAba] = useState<Aba>("chamados");
  const [abaAdmin, setAbaAdmin] = useState<AbaAdmin>("usuarios");
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [condominios, setCondominios] = useState<Condominio[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioSistema[]>([]);
  const [accessLogs, setAccessLogs] = useState<AccessLog[]>([]);

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

  const podeIniciarAtendimento =
    usuarioLogado?.perfil === "admin" || usuarioLogado?.perfil === "tecnico";

  const podeGerenciarCondominios =
    usuarioLogado?.perfil === "admin" ||
    usuarioLogado?.perfil === "monitoramento";

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

  async function carregarChamados() {
    const response = await fetch(`${API_URL}/api/chamados/`, {
      cache: "no-store",
      headers: authHeaders,
    });
    const data = await response.json();
    setChamados(data);
  }

  async function carregarCondominios() {
    const response = await fetch(`${API_URL}/api/condominios/`, {
      cache: "no-store",
      headers: authHeaders,
    });
    const data = await response.json();
    setCondominios(data);
  }

  async function carregarAdmin() {
    if (usuarioLogado?.perfil !== "admin") {
      return;
    }

    const [usuariosResponse, logsResponse] = await Promise.all([
      fetch(`${API_URL}/api/usuarios/`, {
        cache: "no-store",
        headers: authHeaders,
      }),
      fetch(`${API_URL}/api/access-logs/`, {
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
      data,
      ...listaAtual.filter((item) => item.id !== data.id),
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
    if (!novoUsuario || !novaSenha || !novoPerfil) {
      alert("Preencha usuário, senha e perfil");
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
  }

  function cancelarEdicaoUsuario() {
    setEditandoUsuarioId(null);
    setEdicaoUsuarioNome("");
    setEdicaoUsuarioPerfil("monitoramento");
    setEdicaoUsuarioAtivo(true);
    setEdicaoUsuarioSenha("");
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

    if (edicaoUsuarioSenha) {
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
  }

  async function resolverChamado(id: number) {
    await fetch(`${API_URL}/api/chamados/${id}/`, {
      method: "PATCH",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: "resolvido",
      }),
    });

    carregarChamados();
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
    setLogado(true);
    setErroLogin("");
    setSenha("");
  }

  function sair() {
    localStorage.removeItem("delta-logado");
    localStorage.removeItem("delta-token");
    localStorage.removeItem("delta-user");
    setLogado(false);
    setToken("");
    setUsuarioLogado(null);
    setUsuario("");
    setSenha("");
    setErroLogin("");
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
        setChamados(listaChamados);
        setCondominios(listaCondominios);
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
            setChamados(listaChamados);
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
  }, [authHeaders, logado, token]);

  if (!logado) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
          <section className="flex items-center px-6 py-10 sm:px-10 lg:px-16">
            <div className="w-full max-w-md">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
                Delta Chamados
              </p>

              <h1 className="mb-4 text-4xl font-bold leading-tight sm:text-5xl">
                Acesso ao painel
              </h1>

              <p className="mb-8 text-base leading-7 text-zinc-400">
                Entre para acompanhar chamados, condomínios e atendimentos em
                andamento.
              </p>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
                <div className="grid gap-4">
                  <label className="grid gap-2 text-sm font-medium text-zinc-300">
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
                      className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-blue-400"
                      placeholder="Digite seu usuário"
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-medium text-zinc-300">
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
                      className="rounded-md border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-blue-400"
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
                    className="rounded-md bg-white px-4 py-3 font-semibold text-black transition hover:bg-zinc-200"
                  >
                    Entrar
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="hidden border-l border-zinc-800 bg-zinc-900 lg:block">
            <div className="flex h-full flex-col justify-between p-12">
              <div>
                <div className="mb-8 h-12 w-12 rounded-lg bg-blue-500" />
                <h2 className="max-w-sm text-3xl font-semibold leading-tight">
                  Organização simples para a rotina técnica dos condomínios.
                </h2>
              </div>

              <div className="grid gap-4 text-sm text-zinc-400">
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
                  Chamados abertos, urgentes e resolvidos em um só painel.
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-5">
                  Registro com descrição, condomínio e foto da ocorrência.
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {mensagemPopup && (
        <div className="fixed left-1/2 top-5 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-lg border border-green-500/40 bg-green-950/95 px-5 py-4 text-center font-semibold text-green-100 shadow-2xl shadow-black/40">
          {mensagemPopup}
        </div>
      )}

      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="border-b border-zinc-800 bg-black p-5 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r lg:p-4">
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
              className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white lg:hidden"
            >
              Sair
            </button>
          </div>

          <div className="mb-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <button
              onClick={() => setAba("chamados")}
              className={`rounded-md p-3 text-left font-semibold transition ${
                aba === "chamados"
                  ? "bg-white text-black"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              + Abrir Chamado
            </button>

            <button
              onClick={() => setAba("andamento")}
              className={`rounded-md p-3 text-left font-semibold transition ${
                aba === "andamento"
                  ? "bg-white text-black"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              Em Atendimento
            </button>

            <button
              onClick={() => setAba("historico")}
              className={`rounded-md p-3 text-left font-semibold transition ${
                aba === "historico"
                  ? "bg-white text-black"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              Histórico
            </button>

            <button
              onClick={() => setAba("condominios")}
              className={`rounded-md p-3 text-left font-semibold transition ${
                aba === "condominios"
                  ? "bg-white text-black"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              Condomínios
            </button>

            {usuarioLogado?.perfil === "admin" && (
              <button
                onClick={() => {
                  setAba("admin");
                  carregarAdmin();
                }}
                className={`rounded-md p-3 text-left font-semibold transition ${
                  aba === "admin"
                    ? "bg-white text-black"
                    : "bg-zinc-900 text-white hover:bg-zinc-800"
                }`}
              >
                Administração
              </button>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-sm text-zinc-400">Chamados Abertos</p>
              <h2 className="text-3xl font-bold">{chamadosAbertos.length}</h2>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-sm text-zinc-400">Em Atendimento</p>
              <h2 className="text-3xl font-bold text-blue-500">
                {chamadosEmAtendimento.length}
              </h2>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-sm text-zinc-400">Urgentes</p>
              <h2 className="text-3xl font-bold text-red-500">
                {chamadosUrgentes.length}
              </h2>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-sm text-zinc-400">Resolvidos</p>
              <h2 className="text-3xl font-bold text-green-500">
                {chamadosResolvidos.length}
              </h2>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-sm text-zinc-400">Condomínios</p>
              <h2 className="text-3xl font-bold text-blue-500">
                {condominios.length}
              </h2>
            </div>
          </div>
        </aside>

        <div className="flex-1 p-5 sm:p-8 lg:p-10">
          <div className="mx-auto max-w-5xl">
            <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h1 className="mb-2 text-4xl font-bold sm:text-5xl">
                  Delta Chamados
                </h1>
                <p className="text-zinc-400">
                  Gestão técnica de ocorrências
                  {usuarioLogado && ` - ${usuarioLogado.perfil}`}
                </p>
              </div>

              <button
                onClick={sair}
                className="hidden rounded-md border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white lg:block"
              >
                Sair
              </button>
            </div>

            {aba === "condominios" && (
              <>
                {podeGerenciarCondominios && (
                <div className="mb-8 rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
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
                      className="rounded-md border border-zinc-800 bg-zinc-950 p-4 text-white outline-none transition focus:border-blue-400"
                    />

                    <input
                      type="text"
                      placeholder="Endereço"
                      value={enderecoCondominio}
                      onChange={(event) =>
                        setEnderecoCondominio(event.target.value)
                      }
                      className="rounded-md border border-zinc-800 bg-zinc-950 p-4 text-white outline-none transition focus:border-blue-400"
                    />

                    <button
                      onClick={cadastrarCondominio}
                      className="rounded-md bg-blue-600 p-4 font-semibold text-white transition hover:bg-blue-700"
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
                      className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-xl"
                    >
                      {editandoCondominioId === item.id ? (
                        <div className="grid gap-4">
                          <input
                            type="text"
                            value={edicaoCondominioNome}
                            onChange={(event) =>
                              setEdicaoCondominioNome(event.target.value)
                            }
                            className="rounded-md border border-zinc-800 bg-zinc-950 p-4 text-white outline-none transition focus:border-blue-400"
                          />

                          <input
                            type="text"
                            value={edicaoCondominioEndereco}
                            onChange={(event) =>
                              setEdicaoCondominioEndereco(event.target.value)
                            }
                            className="rounded-md border border-zinc-800 bg-zinc-950 p-4 text-white outline-none transition focus:border-blue-400"
                          />

                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={() => salvarEdicaoCondominio(item.id)}
                              className="rounded-md bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200"
                            >
                              Salvar
                            </button>

                            <button
                              onClick={cancelarEdicaoCondominio}
                              className="rounded-md border border-zinc-700 px-5 py-3 font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
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

                              <p className="text-zinc-400">{item.endereco}</p>
                            </div>

                            {podeGerenciarCondominios && (
                              <div className="flex flex-wrap gap-3">
                                <button
                                  onClick={() =>
                                    iniciarEdicaoCondominio(item)
                                  }
                                  className="rounded-md border border-zinc-700 px-5 py-3 font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
                                >
                                  Editar
                                </button>

                                <button
                                  onClick={() => excluirCondominio(item.id)}
                                  className="rounded-md border border-red-900 px-5 py-3 font-medium text-red-300 transition hover:border-red-500 hover:text-red-100"
                                >
                                  Excluir
                                </button>
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

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      onClick={() => {
                        setAbaAdmin("usuarios");
                        carregarAdmin();
                      }}
                      className={`rounded-md p-3 text-left font-semibold transition ${
                        abaAdmin === "usuarios"
                          ? "bg-white text-black"
                          : "bg-zinc-900 text-white hover:bg-zinc-800"
                      }`}
                    >
                      Usuários
                    </button>

                    <button
                      onClick={() => {
                        setAbaAdmin("logs");
                        carregarAdmin();
                      }}
                      className={`rounded-md p-3 text-left font-semibold transition ${
                        abaAdmin === "logs"
                          ? "bg-white text-black"
                          : "bg-zinc-900 text-white hover:bg-zinc-800"
                      }`}
                    >
                      Logs de acesso
                    </button>
                  </div>
                </div>

                {abaAdmin === "usuarios" && (
                  <>
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
                      <h2 className="mb-5 text-2xl font-semibold">
                        Criar usuário
                      </h2>

                      <div className="grid gap-4 md:grid-cols-[1fr_1fr_220px_auto]">
                        <input
                          type="text"
                          placeholder="Usuário"
                          value={novoUsuario}
                          onChange={(event) =>
                            setNovoUsuario(event.target.value)
                          }
                          className="rounded-md border border-zinc-800 bg-zinc-950 p-4 text-white outline-none transition focus:border-blue-400"
                        />

                        <input
                          type="password"
                          placeholder="Senha"
                          value={novaSenha}
                          onChange={(event) => setNovaSenha(event.target.value)}
                          className="rounded-md border border-zinc-800 bg-zinc-950 p-4 text-white outline-none transition focus:border-blue-400"
                        />

                        <select
                          value={novoPerfil}
                          onChange={(event) =>
                            setNovoPerfil(
                              event.target.value as UsuarioSistema["perfil"]
                            )
                          }
                          className="rounded-md border border-zinc-800 bg-zinc-950 p-4 text-white outline-none transition focus:border-blue-400"
                        >
                          <option value="admin">Admin</option>
                          <option value="monitoramento">Monitoramento</option>
                          <option value="tecnico">Técnico</option>
                        </select>

                        <button
                          onClick={cadastrarUsuario}
                          className="rounded-md bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200"
                        >
                          Criar
                        </button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
                      <h2 className="mb-5 text-2xl font-semibold">
                        Usuários
                      </h2>

                      <div className="grid gap-3">
                        {usuarios.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-md border border-zinc-800 bg-zinc-950 p-4"
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
                                    className="rounded-md border border-zinc-800 bg-zinc-950 p-4 text-white outline-none transition focus:border-blue-400"
                                  />

                                  <select
                                    value={edicaoUsuarioPerfil}
                                    onChange={(event) =>
                                      setEdicaoUsuarioPerfil(
                                        event.target
                                          .value as UsuarioSistema["perfil"]
                                      )
                                    }
                                    className="rounded-md border border-zinc-800 bg-zinc-950 p-4 text-white outline-none transition focus:border-blue-400"
                                  >
                                    <option value="admin">Admin</option>
                                    <option value="monitoramento">
                                      Monitoramento
                                    </option>
                                    <option value="tecnico">Técnico</option>
                                  </select>

                                  <label className="flex items-center gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-4 text-white">
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

                                <input
                                  type="password"
                                  placeholder="Nova senha, deixe em branco para manter"
                                  value={edicaoUsuarioSenha}
                                  onChange={(event) =>
                                    setEdicaoUsuarioSenha(event.target.value)
                                  }
                                  className="rounded-md border border-zinc-800 bg-zinc-950 p-4 text-white outline-none transition focus:border-blue-400"
                                />

                                <div className="flex flex-wrap gap-3">
                                  <button
                                    onClick={() => salvarUsuario(item.id)}
                                    className="rounded-md bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200"
                                  >
                                    Salvar
                                  </button>

                                  <button
                                    onClick={cancelarEdicaoUsuario}
                                    className="rounded-md border border-zinc-700 px-5 py-3 font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
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
                                  <p className="text-sm text-zinc-500">
                                    {item.perfil} -{" "}
                                    {item.is_active ? "ativo" : "inativo"}
                                  </p>
                                </div>

                                <div className="flex flex-wrap gap-3">
                                  <button
                                    onClick={() => iniciarEdicaoUsuario(item)}
                                    className="rounded-md border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
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

                {abaAdmin === "logs" && (
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-xl">
                    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h2 className="text-2xl font-semibold">
                        Logs de acesso
                      </h2>

                      <button
                        onClick={carregarAdmin}
                        className="rounded-md border border-zinc-700 px-4 py-3 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
                      >
                        Atualizar
                      </button>
                    </div>

                    <div className="grid gap-3">
                      {accessLogs.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-md border border-zinc-800 bg-zinc-950 p-4"
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

                          <p className="mt-2 text-sm text-zinc-500">
                            {formatarData(item.criado_em)} - IP:{" "}
                            {item.ip || "não identificado"} - {item.perfil}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {(aba === "chamados" || aba === "andamento" || aba === "historico") && (
              <>
                {aba === "chamados" && (
                  <div className="mb-8 rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
                    <h2 className="mb-5 text-2xl font-semibold">
                      Novo Chamado
                    </h2>

                    <div className="grid gap-4">
                      <input
                        type="text"
                        placeholder="Título"
                        value={titulo}
                        onChange={(event) => setTitulo(event.target.value)}
                        className="rounded-md border border-zinc-800 bg-zinc-950 p-4 text-white outline-none transition focus:border-blue-400"
                      />

                      <textarea
                        placeholder="Descrição"
                        value={descricao}
                        onChange={(event) => setDescricao(event.target.value)}
                        className="min-h-28 rounded-md border border-zinc-800 bg-zinc-950 p-4 text-white outline-none transition focus:border-blue-400"
                      />

                      <select
                        value={condominio}
                        onChange={(event) => setCondominio(event.target.value)}
                        className="rounded-md border border-zinc-800 bg-zinc-950 p-4 text-white outline-none transition focus:border-blue-400"
                      >
                        <option value="">Selecione o condomínio</option>

                        {condominios.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.nome}
                          </option>
                        ))}
                      </select>

                      <label className="flex items-center gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-4 text-white">
                        <input
                          type="checkbox"
                          checked={urgente}
                          onChange={(event) =>
                            setUrgente(event.target.checked)
                          }
                          className="h-5 w-5"
                        />

                        <span>Este chamado é urgente</span>
                      </label>

                      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-zinc-700 bg-zinc-950 p-6 text-white transition hover:border-white">
                        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                          Foto
                        </span>

                        <span className="font-semibold">
                          Clique aqui para adicionar uma foto
                        </span>

                        <span className="text-sm text-zinc-400">
                          PNG, JPG ou JPEG
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
                        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <p className="text-sm text-zinc-400">
                              Imagem selecionada:{" "}
                              <span className="text-zinc-200">
                                {imagem.name}
                              </span>
                            </p>

                            <button
                              type="button"
                              onClick={() => setImagem(null)}
                              className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-red-400 hover:text-red-200"
                            >
                              Remover foto
                            </button>
                          </div>

                          {imagemPreview && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={imagemPreview}
                              alt="Prévia da imagem selecionada"
                              className="max-h-80 w-full rounded-md border border-zinc-800 object-contain"
                            />
                          )}
                        </div>
                      )}

                      <button
                        onClick={criarChamado}
                        className="rounded-md bg-white p-4 font-semibold text-black transition hover:bg-zinc-200"
                      >
                        Criar Chamado
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid gap-5">
                  {chamados
                    .filter((chamado) =>
                      aba === "historico"
                        ? chamadoEstaNoHistorico(chamado)
                        : aba === "andamento"
                          ? chamado.status === "andamento"
                          : chamado.status === "aberto"
                    )
                    .map((chamado) => (
                      <div
                        key={chamado.id}
                        title={`Aberto por: ${chamado.criado_por_nome || "nao informado"}`}
                        className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-xl"
                      >
                        {editandoChamadoId === chamado.id ? (
                          <div className="grid gap-4">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                              <h2 className="text-2xl font-semibold">
                                Editar chamado
                              </h2>

                              <span className="rounded-full bg-zinc-800 px-4 py-2 text-sm font-medium text-zinc-300">
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
                              className="rounded-md border border-zinc-800 bg-zinc-950 p-4 text-white outline-none transition focus:border-blue-400"
                            />

                            <textarea
                              placeholder="Descrição"
                              value={edicaoDescricao}
                              onChange={(event) =>
                                setEdicaoDescricao(event.target.value)
                              }
                              className="min-h-28 rounded-md border border-zinc-800 bg-zinc-950 p-4 text-white outline-none transition focus:border-blue-400"
                            />

                            <select
                              value={edicaoCondominio}
                              onChange={(event) =>
                                setEdicaoCondominio(event.target.value)
                              }
                              className="rounded-md border border-zinc-800 bg-zinc-950 p-4 text-white outline-none transition focus:border-blue-400"
                            >
                              <option value="">Selecione o condomínio</option>

                              {condominios.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.nome}
                                </option>
                              ))}
                            </select>

                            <label className="flex items-center gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-4 text-white">
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
                                <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm text-zinc-400">
                                      Foto atual
                                    </p>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        setEdicaoRemoverImagem(true)
                                      }
                                      className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-red-400 hover:text-red-200"
                                    >
                                      Remover foto atual
                                    </button>
                                  </div>

                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={chamado.imagem}
                                    alt="Foto atual do chamado"
                                    className="max-h-80 w-full rounded-md border border-zinc-800 object-contain"
                                  />
                                </div>
                              )}

                            {edicaoRemoverImagem && !edicaoImagem && (
                              <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                A foto atual será removida ao salvar.
                              </p>
                            )}

                            <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-zinc-700 bg-zinc-950 p-6 text-white transition hover:border-white">
                              <span className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                Foto
                              </span>

                              <span className="font-semibold">
                                Clique aqui para trocar a foto
                              </span>

                              <span className="text-sm text-zinc-400">
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
                              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                  <p className="text-sm text-zinc-400">
                                    Nova imagem:{" "}
                                    <span className="text-zinc-200">
                                      {edicaoImagem.name}
                                    </span>
                                  </p>

                                  <button
                                    type="button"
                                    onClick={() => setEdicaoImagem(null)}
                                    className="rounded-md border border-zinc-700 px-3 py-2 text-sm font-medium text-zinc-300 transition hover:border-red-400 hover:text-red-200"
                                  >
                                    Remover troca
                                  </button>
                                </div>

                                {edicaoImagemPreview && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={edicaoImagemPreview}
                                    alt="Prévia da nova imagem"
                                    className="max-h-80 w-full rounded-md border border-zinc-800 object-contain"
                                  />
                                )}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-3">
                              <button
                                onClick={() =>
                                  salvarEdicaoChamado(chamado.id)
                                }
                                className="rounded-md bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200"
                              >
                                Salvar alterações
                              </button>

                              <button
                                onClick={cancelarEdicao}
                                className="rounded-md border border-zinc-700 px-5 py-3 font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <h2 className="text-2xl font-semibold">
                            {chamado.titulo}
                          </h2>

                          <div className="flex flex-wrap gap-2">
                            {chamado.urgente && (
                              <span className="rounded-full bg-red-500/20 px-4 py-2 text-sm font-medium text-red-400">
                                Urgente
                              </span>
                            )}

                            <span
                              className={`
                              rounded-full px-4 py-2 text-sm font-medium
                              ${
                                chamado.status === "aberto"
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : ""
                              }
                              ${
                                chamado.status === "andamento"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : ""
                              }
                              ${
                                chamado.status === "resolvido"
                                  ? "bg-green-500/20 text-green-400"
                                  : ""
                              }
                            `}
                            >
                              {chamado.status}
                            </span>
                          </div>
                        </div>

                        <p className="mb-5 text-zinc-300">
                          {chamado.descricao}
                        </p>

                        {chamado.imagem && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={chamado.imagem}
                            alt="Imagem do chamado"
                            className="mb-5 max-h-96 w-full rounded-lg border border-zinc-800 object-cover"
                          />
                        )}

                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="text-sm text-zinc-500">
                            <p>
                              Condomínio:{" "}
                              {chamado.condominio_nome || chamado.condominio}
                            </p>

                            <p>
                              Aberto por:{" "}
                              {chamado.criado_por_nome || "nao informado"}
                            </p>

                            <p>
                              Aberto em: {formatarData(chamado.criado_em)}
                            </p>

                            {chamado.status === "resolvido" &&
                              chamado.resolvido_em && (
                                <p>
                                  Resolvido em:{" "}
                                  {formatarData(chamado.resolvido_em)}
                                </p>
                              )}

                            {chamado.urgente ? (
                              <p className="font-semibold text-red-400">
                                Urgente
                              </p>
                            ) : (
                              <p className="text-zinc-400">Normal</p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-3">
                            <button
                              onClick={() => iniciarEdicao(chamado)}
                              className="rounded-md border border-zinc-700 px-5 py-3 font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white"
                            >
                              Editar
                            </button>

                            {chamado.status === "aberto" &&
                              podeIniciarAtendimento && (
                              <button
                                onClick={() =>
                                  iniciarAtendimento(chamado.id)
                                }
                                className="rounded-md bg-blue-600 px-5 py-3 font-medium text-white transition hover:bg-blue-700"
                              >
                                Iniciar atendimento
                              </button>
                            )}

                            {chamado.status === "andamento" && (
                              <button
                                onClick={() => resolverChamado(chamado.id)}
                                className="rounded-md bg-green-600 px-5 py-3 font-medium text-white transition hover:bg-green-700"
                              >
                                Marcar como resolvido
                              </button>
                            )}
                          </div>
                        </div>
                          </>
                        )}
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
