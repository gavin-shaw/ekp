import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import moment from 'moment';
import { Repository } from 'typeorm';
import { Farm } from './farm.entity';
import starterFarms from './starter-farms';

@Injectable()
export class FarmPersistService {
  constructor(
    @InjectRepository(Farm) private farmRepository: Repository<Farm>,
  ) {}

  async getEnabledFarms(since?: number) {
    const farms = await this.farmRepository.find({
      where: {
        disabled: false,
      },
    });

    return farms;
  }

  async save(farms: Farm[]): Promise<void> {
    const now = moment().unix();
    await this.farmRepository.save(
      farms.map((farm) => ({
        ...farm,
        created: farm.created || now,
        updated: now,
      })),
    );
  }

  async loadStarterFarms(): Promise<void> {
    const farms = await this.farmRepository.find();
    const farmAddresses = farms.map((farm) => farm.contractAddress);

    const newStarterFarms = starterFarms.filter(
      (starterFarm) => !farmAddresses.includes(starterFarm),
    );

    if (newStarterFarms.length > 0) {
      await this.farmRepository.save(
        newStarterFarms.map((contractAddress) => ({
          contractAddress,
        })),
      );
    }
  }
}
