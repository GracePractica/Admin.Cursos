document.addEventListener('DOMContentLoaded', () => {
    loadLog();
});

async function loadLog() {
    try {

        // 1️⃣ Traer registros del log
        const { data: logs, error: logError } = await supabaseClient
            .from('log')
            .select(`
                id_log,
                user_id,
                tabla_afectada,
                accion,
                registro_id,
                datos_anteriores,
                datos_nuevos,
                created_at
            `)
            .order('created_at', { ascending: false });

        if (logError) throw logError;

        if (!logs || logs.length === 0) {
            renderLog([]);
            return;
        }

        // 2️⃣ Obtener UUIDs únicos
        const userIds = [...new Set(logs.map(l => l.user_id))];

        // 3️⃣ Traer nombres desde perfiles
        const { data: perfiles, error: perfilError } = await supabaseClient
            .from('perfiles')
            .select('id, nombre')
            .in('id', userIds);

        if (perfilError) throw perfilError;

        // 4️⃣ Crear mapa uuid -> nombre
        const userMap = {};
        perfiles.forEach(p => {
            userMap[p.id] = p.nombre;
        });

        // 5️⃣ Agregar nombre al log
        const logsConNombre = logs.map(log => ({
            ...log,
            nombre_usuario: userMap[log.user_id] || 'Usuario desconocido'
        }));

        renderLog(logsConNombre);

    } catch (error) {
        console.error('Error cargando log:', error);
    }
}

function renderLog(logs) {

    const tbody = document.getElementById('logTableBody');
    tbody.innerHTML = '';

    if (!logs || logs.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6">No hay registros.</td>
            </tr>
        `;
        return;
    }

    logs.forEach(log => {

        const row = `
            <tr>
                <td>${log.nombre_usuario}</td>
                <td>${log.tabla_afectada}</td>
                <td>
                    <span class="badge ${
                        log.accion === 'INSERT' ? 'badge-success' :
                        log.accion === 'UPDATE' ? 'badge-warning' :
                        log.accion === 'DELETE' ? 'badge-danger' :
                        'badge-info'
                    }">
                        ${log.accion}
                    </span>
                </td>
                <td>${log.registro_id}</td>
                <td>${new Date(log.created_at).toLocaleString()}</td>
                <td>
                    <button class="btn btn-small btn-outline"
                        onclick='verDetalle(${JSON.stringify(log)})'>
                        Ver
                    </button>
                </td>
            </tr>
        `;

        tbody.innerHTML += row;
    });
}

function verDetalle(log) {
    alert(
        "Datos anteriores:\n\n" +
        JSON.stringify(log.datos_anteriores, null, 2) +
        "\n\nDatos nuevos:\n\n" +
        JSON.stringify(log.datos_nuevos, null, 2)
    );
}