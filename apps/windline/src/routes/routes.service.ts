import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Route } from '@windline/entities';

@Injectable()
export class RoutesService {
  constructor(
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
  ) {}

  async findById(id: string): Promise<Route | null> {
    return this.routeRepository.findOne({ where: { id } });
  }

  async findByHash(hash: string): Promise<Route | null> {
    return this.routeRepository.findOne({ where: { hash } });
  }

  async findByUserId(userId: number): Promise<Route[]> {
    return this.routeRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.routeRepository.delete(id);
    return (result.affected ?? 0) > 0;
  }
}
