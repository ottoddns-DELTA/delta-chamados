"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://delta-chamados-production.up.railway.app";

const LOGIN_USER = process.env.NEXT_PUBLIC_LOGIN_USER ?? "admin";
const LOGIN_PASSWORD = process.env.NEXT_PUBLIC_LOGIN_PASSWORD ?? "delta123";
const DIAS_NO_HISTORICO = 30;

type Aba = "chamados" | "historico" | "condominios";

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
  urgente: boolean;
  imagem?: string | null;
  status: "aberto" | "andamento" | "resolvido";
  criado_em?: string;
  atualizado_em?: string;
  resolvido_em?: string | null;
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
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erroLogin, setErroLogin] = useState("");

  const [aba, setAba] = useState<Aba>("chamados");
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [condominios, setCondominios] = useState<Condominio[]>([]);

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

  const chamadosAbertos = useMemo(
    () => chamados.filter((chamado) => chamado.status !== "resolvido"),
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

  const imagemPreview = useMemo(
    () => (imagem ? URL.createObjectURL(imagem) : ""),
    [imagem]
  );

  const edicaoImagemPreview = useMemo(
    () => (edicaoImagem ? URL.createObjectURL(edicaoImagem) : ""),
    [edicaoImagem]
  );

  async function carregarChamados() {
    const response = await fetch(`${API_URL}/api/chamados/`, {
      cache: "no-store",
    });
    const data = await response.json();
    setChamados(data);
  }

  async function carregarCondominios() {
    const response = await fetch(`${API_URL}/api/condominios/`, {
      cache: "no-store",
    });
    const data = await response.json();
    setCondominios(data);
  }

  async function cadastrarCondominio() {
    if (!nomeCondominio || !enderecoCondominio) {
      alert("Preencha nome e endereço do condomínio");
      return;
    }

    const response = await fetch(`${API_URL}/api/condominios/`, {
      method: "POST",
      headers: {
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
  }

  async function resolverChamado(id: number) {
    await fetch(`${API_URL}/api/chamados/${id}/`, {
      method: "PATCH",
      headers: {
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

  function entrar() {
    if (usuario === LOGIN_USER && senha === LOGIN_PASSWORD) {
      localStorage.setItem("delta-logado", "true");
      setLogado(true);
      setErroLogin("");
      setSenha("");
      return;
    }

    setErroLogin("Usuário ou senha inválidos.");
  }

  function sair() {
    localStorage.removeItem("delta-logado");
    setLogado(false);
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
    if (!logado) {
      return;
    }

    Promise.all([
      fetch(`${API_URL}/api/chamados/`, { cache: "no-store" }).then(
        (response) => response.json()
      ),
      fetch(`${API_URL}/api/condominios/`, { cache: "no-store" }).then(
        (response) => response.json()
      ),
    ]).then(([listaChamados, listaCondominios]) => {
      setChamados(listaChamados);
      setCondominios(listaCondominios);
    });
  }, [logado]);

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
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="border-b border-zinc-800 bg-black p-5 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r lg:p-6">
          <div className="mb-6 flex items-center justify-between gap-4 lg:mb-8">
            <div className="flex h-12 w-44 items-center">
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
              Chamados
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-sm text-zinc-400">Chamados</p>
              <h2 className="text-3xl font-bold">{chamadosAbertos.length}</h2>
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

                <div className="grid gap-5">
                  {condominios.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-xl"
                    >
                      <h2 className="mb-2 text-2xl font-semibold">
                        {item.nome}
                      </h2>

                      <p className="text-zinc-400">{item.endereco}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {(aba === "chamados" || aba === "historico") && (
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
                        : chamado.status !== "resolvido"
                    )
                    .map((chamado) => (
                      <div
                        key={chamado.id}
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

                            {chamado.status === "aberto" && (
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
                                Resolver
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
