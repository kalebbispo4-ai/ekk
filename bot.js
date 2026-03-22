const { Client } = require('discord.js-selfbot-v13');
const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const app = express();

app.use(cors());
const processos = new Map();

app.get('/cmd', async (req, res) => {
    const { acao, id, token, guild } = req.query;
    if (!token || !guild || !id) return res.send({ status: "erro", msg: "Dados incompletos" });

    const key_rodar = `rodar-${id}`;
    const key_mutar = `mutar-${id}`;
    const key_proteger = `proteger-${id}`;
    const key_coleira = `coleira-${id}`;

    // --- PARAR ---
    if (acao === 'parar') {
        [key_rodar, key_mutar, key_proteger, key_coleira].forEach(k => {
            if (processos.has(k)) {
                const p = procesos.get(k);
                if (p.loop) clearInterval(p.loop);
                if (p.client) {
                    try { p.client.destroy(); } catch (e) {}
                }
                processos.delete(k);
            }
        });
        return res.send({ status: "parado" });
    }

    // --- RODÍZIO ---
    if (acao === 'rodar') {
        if (processos.has(key_rodar)) return res.send({ status: "ativo" });
        const client = new Client();
        client.on('ready', async () => {
            const loop = setInterval(async () => {
                try {
                    const g = await client.guilds.fetch(guild);
                    const canais = g.channels.cache.filter(c => c.type === 'GUILD_VOICE').map(c => c.id);
                    const member = await g.members.fetch(id);
                    if (member.voice.channelId && canais.length > 1) {
                        const destino = canais.filter(c => c !== member.voice.channelId)[Math.floor(Math.random() * (canais.length - 1))];
                        await member.voice.setChannel(destino);
                    }
                } catch (e) {}
            }, 2000);
            processos.set(key_rodar, { client, loop });
        });
        client.login(token).catch(() => {});
        return res.send({ status: "sucesso" });
    }

    // --- MUTAR ---
    if (acao === 'mutar') {
        if (processos.has(key_mutar)) return res.send({ status: "ativo" });
        const client = new Client();
        client.on('ready', () => {
            const loop = setInterval(async () => {
                fetch(`https://discord.com/api/v9/guilds/${guild}/members/${id}`, {
                    method: 'PATCH',
                    headers: { 'Authorization': token, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ mute: true })
                }).catch(() => {});
            }, 800);
            processos.set(key_mutar, { client, loop });
        });
        client.login(token).catch(() => {});
        return res.send({ status: "sucesso" });
    }

    // --- PROTEGER ---
    if (acao === 'proteger') {
        if (processos.has(key_proteger)) return res.send({ status: "ativo" });
        const client = new Client();
        
        client.on('voiceStateUpdate', async (old, next) => {
            if (next.id === id && next.serverMute) {
                try { await next.setMute(false); } catch (e) {}
            }
        });

        client.on('ready', () => {
            const loop = setInterval(async () => {
                try {
                    const g = await client.guilds.fetch(guild);
                    const m = await g.members.fetch(id);
                    if (m.voice.serverMute) await m.voice.setMute(false);
                } catch (e) {}
            }, 1500);
            processos.set(key_proteger, { client, loop });
        });

        client.login(token).catch(() => {});
        return res.send({ status: "sucesso" });
    }

    // --- COLEIRA ---
    if (acao === 'coleira') {
        if (processos.has(key_coleira)) return res.send({ status: "ativo" });
        const client = new Client();
        client.on('voiceStateUpdate', async (old, next) => {
            if (next.id === client.user.id && next.channelId) {
                try {
                    const g = await client.guilds.fetch(guild);
                    const alvo = await g.members.fetch(id);
                    if (alvo.voice.channelId) await alvo.voice.setChannel(next.channelId);
                } catch (e) {}
            }
        });
        processos.set(key_coleira, { client, loop: null });
        client.login(token).catch(() => {});
        return res.send({ status: "sucesso" });
    }
});

// AJUSTE PARA SHARDCLOUD: Porta 80 e Host 0.0.0.0
app.listen(80, '0.0.0.0', () => console.log("🚀 CORE 7KZ ONLINE NA NUVEM - AGUARDANDO COMANDOS"));