import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from './prisma.service';

/**
 * Abre uma transação do Postgres e entrega o cliente `tx` para o bloco de trabalho.
 *
 * O service chama `run` quando precisa gravar mais de uma coisa que deve
 * entrar junta (ex.: task + activity). Se o bloco termina, o banco confirma.
 * Se qualquer await lança, o banco desfaz tudo que usou esse `tx`.
 *
 * Quem decide o que gravar é o service. Esta classe só abre e fecha a transação.
 * Os repositórios precisam receber o `tx`; uma query no client normal fica
 * fora da transação e o rollback não a desfaz.
 */
@Injectable()
export class UnitOfWork {
  constructor(private readonly prisma: PrismaService) {}

  run<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(work);
  }
}
