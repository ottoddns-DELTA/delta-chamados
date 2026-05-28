"use client";

import { useEffect, useState } from "react";

const API_URL = "https://delta-chamados-production.up.railway.app";

export default function Home() {
  const [aba, setAba] = useState("chamados");

  const [chamados, setChamados] = useState([]);
  const [condominios, setCondominios] = useState([]);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [condominio, setCondominio] = useState("");
  const [urgente, setUrgente] = useState(false);
  const [imagem, setImagem] = useState<File | null>(null);

  const [nomeCondominio, setNomeCondominio] = useState("");
  const [enderecoCondominio, setEnderecoCondominio] = useState("");

  async function carregarChamados() {
    const response = await fetch(`${API_URL}/api/chamados/`);
    const data = await response.json();
    setChamados(data);
  }

  async function carregarCondominios() {
    const response = await fetch(`${API_URL}/api/condominios/`);
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

    const data = await response.json();

    if (!response.ok) {
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

  useEffect(() => {
    carregarChamados();
    carregarCondominios();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <div className="flex">
        <aside className="w-72 min-h-screen bg-black border-r border-zinc-800 p-6">
          <h1 className="text-3xl font-bold mb-8">Delta</h1>

          <div className="space-y-3 mb-8">
            <button
              onClick={() => setAba("chamados")}
              className={`w-full text-left p-3 rounded-xl font-semibold transition ${
                aba === "chamados"
                  ? "bg-white text-black"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              Chamados
            </button>

            <button
              onClick={() => setAba("historico")}
              className={`w-full text-left p-3 rounded-xl font-semibold transition ${
                aba === "historico"
                  ? "bg-white text-black"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              Histórico
            </button>

            <button
              onClick={() => setAba("condominios")}
              className={`w-full text-left p-3 rounded-xl font-semibold transition ${
                aba === "condominios"
                  ? "bg-white text-black"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              Condomínios
            </button>
          </div>

          <div className="space-y-4">
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
              <p className="text-zinc-400 text-sm">Chamados</p>
              <h2 className="text-3xl font-bold">
                {chamados.filter((c: any) => c.status !== "resolvido").length}
              </h2>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
              <p className="text-zinc-400 text-sm">Urgentes</p>
              <h2 className="text-3xl font-bold text-red-500">
                {
                  chamados.filter(
                    (c: any) => c.urgente === true && c.status !== "resolvido"
                  ).length
                }
              </h2>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
              <p className="text-zinc-400 text-sm">Resolvidos</p>
              <h2 className="text-3xl font-bold text-green-500">
                {chamados.filter((c: any) => c.status === "resolvido").length}
              </h2>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
              <p className="text-zinc-400 text-sm">Condomínios</p>
              <h2 className="text-3xl font-bold text-blue-500">
                {condominios.length}
              </h2>
            </div>
          </div>
        </aside>

        <div className="flex-1 p-10">
          <div className="max-w-5xl mx-auto">
            <div className="mb-10">
              <h1 className="text-5xl font-bold mb-2">Delta Chamados</h1>
              <p className="text-zinc-400">Gestão técnica de ocorrências</p>
            </div>

            {aba === "condominios" && (
              <>
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-2xl mb-8">
                  <h2 className="text-2xl font-semibold mb-5">
                    Cadastrar Condomínio
                  </h2>

                  <div className="grid gap-4">
                    <input
                      type="text"
                      placeholder="Nome do condomínio"
                      value={nomeCondominio}
                      onChange={(e) => setNomeCondominio(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-white outline-none"
                    />

                    <input
                      type="text"
                      placeholder="Endereço"
                      value={enderecoCondominio}
                      onChange={(e) => setEnderecoCondominio(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-white outline-none"
                    />

                    <button
                      onClick={cadastrarCondominio}
                      className="bg-blue-600 text-white p-4 rounded-2xl font-semibold hover:bg-blue-700 transition"
                    >
                      Cadastrar Condomínio
                    </button>
                  </div>
                </div>

                <div className="grid gap-5">
                  {condominios.map((item: any) => (
                    <div
                      key={item.id}
                      className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl"
                    >
                      <h2 className="text-2xl font-semibold mb-2">
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
                  <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-2xl mb-8">
                    <h2 className="text-2xl font-semibold mb-5">
                      Novo Chamado
                    </h2>

                    <div className="grid gap-4">
                      <input
                        type="text"
                        placeholder="Título"
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-white outline-none"
                      />

                      <textarea
                        placeholder="Descrição"
                        value={descricao}
                        onChange={(e) => setDescricao(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-white outline-none"
                      />

                      <select
                        value={condominio}
                        onChange={(e) => setCondominio(e.target.value)}
                        className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-white outline-none"
                      >
                        <option value="">Selecione o condomínio</option>

                        {condominios.map((item: any) => (
                          <option key={item.id} value={item.id}>
                            {item.nome}
                          </option>
                        ))}
                      </select>

                      <label className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-white">
                        <input
                          type="checkbox"
                          checked={urgente}
                          onChange={(e) => setUrgente(e.target.checked)}
                          className="w-5 h-5"
                        />

                        <span>Este chamado é urgente</span>
                      </label>

                      <label className="bg-zinc-950 border border-dashed border-zinc-700 p-6 rounded-2xl text-white cursor-pointer hover:border-white transition flex flex-col items-center justify-center gap-2">
                        <span className="text-3xl">📷</span>

                        <span className="font-semibold">
                          Clique aqui para adicionar uma foto
                        </span>

                        <span className="text-sm text-zinc-400">
                          PNG, JPG ou JPEG
                        </span>

                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setImagem(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />
                      </label>

                      {imagem && (
                        <p className="text-sm text-zinc-400">
                          Imagem selecionada: {imagem.name}
                        </p>
                      )}

                      <button
                        onClick={criarChamado}
                        className="bg-white text-black p-4 rounded-2xl font-semibold hover:opacity-90 transition"
                      >
                        Criar Chamado
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid gap-5">
                  {chamados
                    .filter((chamado: any) =>
                      aba === "historico"
                        ? chamado.status === "resolvido"
                        : chamado.status !== "resolvido"
                    )
                    .map((chamado: any) => (
                      <div
                        key={chamado.id}
                        className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl"
                      >
                        <div className="flex justify-between items-center mb-4">
                          <h2 className="text-2xl font-semibold">
                            {chamado.titulo}
                          </h2>

                          <div className="flex gap-2">
                            {chamado.urgente && (
                              <span className="text-sm px-4 py-2 rounded-full font-medium bg-red-500/20 text-red-400">
                                Urgente
                              </span>
                            )}

                            <span
                              className={`
                              text-sm px-4 py-2 rounded-full font-medium
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

                        <p className="text-zinc-300 mb-5">
                          {chamado.descricao}
                        </p>

                        {chamado.imagem && (
                          <img
                            src={chamado.imagem}
                            alt="Imagem do chamado"
                            className="w-full max-h-96 object-cover rounded-2xl mb-5 border border-zinc-800"
                          />
                        )}

                        <div className="flex items-center justify-between">
                          <div className="text-zinc-500 text-sm">
                            <p>
                              Condomínio:{" "}
                              {chamado.condominio_nome || chamado.condominio}
                            </p>

                            {chamado.urgente ? (
                              <p className="text-red-400 font-semibold">
                                🔴 Urgente
                              </p>
                            ) : (
                              <p className="text-zinc-400">⚪ Normal</p>
                            )}
                          </div>

                          <div className="flex gap-3">
                            {chamado.status === "aberto" && (
                              <button
                                onClick={() =>
                                  iniciarAtendimento(chamado.id)
                                }
                                className="bg-blue-600 hover:bg-blue-700 transition text-white px-5 py-3 rounded-2xl font-medium"
                              >
                                Iniciar atendimento
                              </button>
                            )}

                            {chamado.status === "andamento" && (
                              <button
                                onClick={() => resolverChamado(chamado.id)}
                                className="bg-green-600 hover:bg-green-700 transition text-white px-5 py-3 rounded-2xl font-medium"
                              >
                                Resolver
                              </button>
                            )}
                          </div>
                        </div>
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