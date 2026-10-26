from django.contrib.auth import authenticate
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class LoginView(APIView):
    """Recibe usuario y contraseña y devuelve un token de acceso."""

    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '')
        password = request.data.get('password', '')
        user = authenticate(request, username=username, password=password)
        if user is None:
            return Response(
                {'detail': 'Usuario o contraseña incorrectos.'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'username': user.username})


class LogoutView(APIView):
    """Invalida el token del usuario actual."""

    def post(self, request):
        request.auth.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    """Devuelve los datos del usuario autenticado."""

    def get(self, request):
        return Response({'username': request.user.username})
