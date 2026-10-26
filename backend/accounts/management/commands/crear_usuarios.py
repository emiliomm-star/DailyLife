import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError

# Variables de entorno con las credenciales de los dos usuarios autorizados:
#   USUARIO_1_NOMBRE, USUARIO_1_PASSWORD
#   USUARIO_2_NOMBRE, USUARIO_2_PASSWORD
# Las contraseñas nunca se escriben en el código.


class Command(BaseCommand):
    help = 'Crea o actualiza los dos usuarios autorizados desde variables de entorno.'

    def handle(self, *args, **options):
        User = get_user_model()
        for n in (1, 2):
            username = os.environ.get(f'USUARIO_{n}_NOMBRE')
            password = os.environ.get(f'USUARIO_{n}_PASSWORD')
            if not username or not password:
                raise CommandError(
                    f'Faltan USUARIO_{n}_NOMBRE o USUARIO_{n}_PASSWORD en el entorno.'
                )
            user, created = User.objects.get_or_create(username=username)
            user.set_password(password)
            user.save()
            estado = 'creado' if created else 'actualizado'
            self.stdout.write(f'Usuario {username} {estado}.')
