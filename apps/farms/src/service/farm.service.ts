import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import moment from 'moment';
import { IsNull, Not, Repository } from 'typeorm';
import { Farm } from '../entity/farm.entity';
import starterFarms from '../starter-farms';
@Injectable()
export class FarmService {
  constructor(
    @InjectRepository(Farm) private farmRepository: Repository<Farm>,
  ) {}

  async getCurrentFarms(since?: number) {
    const farms = await this.farmRepository.find({
      where: {
        contractName: Not(IsNull()),
      },
    });

    return farms;
  }

  async save(farms: Farm[]) {
    const now = moment().unix();
    await this.farmRepository.save(
      farms.map((farm) => ({
        ...farm,
        created: farm.created || now,
        updated: now,
      })),
    );
  }

  async loadStarterFarms() {
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
