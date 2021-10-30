import { Module } from '@nestjs/common';
import { AppLogger } from './logger';
import { GlobalConstants } from './constants';

@Module({
  providers: [AppLogger, GlobalConstants],
  exports: [AppLogger, GlobalConstants],
})

export class CommonModule {}