import os
from io import StringIO
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient


class AuthTests(TestCase):
    def setUp(self):
        self.client_api = APIClient()
        self.user = get_user_model().objects.create_user(username='emilio', password='clave-test-123')

    def test_login_correcto_devuelve_token(self):
        response = self.client_api.post(
            '/api/auth/login/', {'username': 'emilio', 'password': 'clave-test-123'}, format='json'
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn('token', response.json())

    def test_login_incorrecto_devuelve_401(self):
        response = self.client_api.post(
            '/api/auth/login/', {'username': 'emilio', 'password': 'mala'}, format='json'
        )
        self.assertEqual(response.status_code, 401)

    def test_me_requiere_token(self):
        self.assertEqual(self.client_api.get('/api/auth/me/').status_code, 401)

    def test_me_con_token_devuelve_usuario(self):
        token = Token.objects.create(user=self.user)
        self.client_api.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        response = self.client_api.get('/api/auth/me/')
        self.assertEqual(response.json(), {'username': 'emilio'})

    def test_logout_invalida_token(self):
        token = Token.objects.create(user=self.user)
        self.client_api.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')
        self.assertEqual(self.client_api.post('/api/auth/logout/').status_code, 204)
        self.assertFalse(Token.objects.filter(key=token.key).exists())


class CrearUsuariosTests(TestCase):
    @patch.dict(os.environ, {
        'USUARIO_1_NOMBRE': 'usuario_a',
        'USUARIO_1_PASSWORD': 'clave-a-123',
        'USUARIO_2_NOMBRE': 'usuario_b',
        'USUARIO_2_PASSWORD': 'clave-b-123',
    })
    def test_crea_los_dos_usuarios_desde_entorno(self):
        call_command('crear_usuarios', stdout=StringIO())
        self.assertEqual(get_user_model().objects.count(), 2)
        self.assertTrue(get_user_model().objects.get(username='usuario_a').check_password('clave-a-123'))
