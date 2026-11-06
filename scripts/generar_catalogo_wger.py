"""Genera client/src/data/ejercicios-wger.json a partir de la API pública de wger.

Uso: python3 scripts/generar_catalogo_wger.py
La API no tiene búsqueda por texto en esta versión, así que se descarga el catálogo
completo en español (idioma 2) y se guarda una versión compacta para la app.
Datos: wger (licencias CC-BY-SA). Ver la atribución en la app.
"""
import json
import urllib.request
from pathlib import Path

URL = 'https://wger.de/api/v2/exerciseinfo/?format=json&limit=1000'
SALIDA = Path(__file__).resolve().parent.parent / 'client' / 'src' / 'data' / 'ejercicios-wger.json'
# Idiomas de wger: 2 = inglés, 4 = español.
IDIOMA_ESPANOL = 4
IDIOMA_INGLES = 2

# Las categorías vienen en inglés desde la API.
CATEGORIAS_ES = {
    'Abs': 'Abdominales',
    'Arms': 'Brazos',
    'Back': 'Espalda',
    'Calves': 'Gemelos',
    'Cardio': 'Cardio',
    'Chest': 'Pecho',
    'Legs': 'Piernas',
    'Shoulders': 'Hombros',
}


def nombre_en_idioma(ejercicio, idioma):
    for traduccion in ejercicio.get('translations', []):
        if traduccion.get('language') == idioma and traduccion.get('name'):
            return traduccion['name'].strip()
    return None


def nombre_espanol(ejercicio):
    # Solo español. Si wger no tiene traducción, el ejercicio se usa con el nombre en inglés.
    return nombre_en_idioma(ejercicio, IDIOMA_ESPANOL) or nombre_en_idioma(ejercicio, IDIOMA_INGLES)


def miniatura(imagen):
    # 'thumbnails' puede venir como null: se trata como vacío.
    return (imagen.get('thumbnails') or {}).get('small') or imagen.get('image')


def imagen_principal(ejercicio):
    imagenes = ejercicio.get('images') or []
    for imagen in imagenes:
        if imagen.get('is_main'):
            return miniatura(imagen)
    return miniatura(imagenes[0]) if imagenes else None


def main():
    with urllib.request.urlopen(URL, timeout=120) as respuesta:
        datos = json.load(respuesta)

    catalogo = []
    sin_espanol = 0
    for ejercicio in datos['results']:
        nombre = nombre_espanol(ejercicio)
        if not nombre:
            continue
        if nombre_en_idioma(ejercicio, IDIOMA_ESPANOL) is None:
            sin_espanol += 1
        categoria_en = (ejercicio.get('category') or {}).get('name')
        categoria = CATEGORIAS_ES.get(categoria_en, categoria_en)
        catalogo.append({
            'id': ejercicio['id'],
            'n': nombre,
            'c': categoria,
            'm': [musculo.get('name') for musculo in ejercicio.get('muscles', []) if musculo.get('name')],
            'e': [equipo.get('name') for equipo in ejercicio.get('equipment', []) if equipo.get('name')],
            'i': imagen_principal(ejercicio),
        })

    catalogo.sort(key=lambda e: e['n'].lower())
    SALIDA.parent.mkdir(parents=True, exist_ok=True)
    SALIDA.write_text(json.dumps(catalogo, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'{len(catalogo)} ejercicios -> {SALIDA} ({SALIDA.stat().st_size} bytes); sin traducción al español: {sin_espanol}')


if __name__ == '__main__':
    main()
