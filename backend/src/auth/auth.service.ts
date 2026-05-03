import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { IsEmail, IsString, MinLength, IsNotEmpty } from 'class-validator';
import { OAuth2Client } from 'google-auth-library';
import { User } from '../users/user.entity';
import { UsersService } from '../users/users.service';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  fullName: string;

  @IsString()
  @MinLength(6)
  password: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class GoogleLoginDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already registered');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      email: dto.email,
      fullName: dto.fullName,
      password: hashed,
    });
    await this.userRepo.save(user);

    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    if (!user.password) {
      throw new UnauthorizedException('Tài khoản này chỉ đăng nhập bằng Google');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.usersService.recordSuccessfulLogin(user.id);

    const token = this.jwtService.sign({ sub: user.id, email: user.email });
    const { password, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  async getMe(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    const { password, ...rest } = user;
    return rest;
  }

  /** Đăng nhập / đăng ký nhanh bằng Google ID token (GIS credential JWT) */
  async loginWithGoogle(idToken: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
    if (!clientId) {
      throw new UnauthorizedException('Google sign-in chưa được cấu hình (GOOGLE_CLIENT_ID)');
    }

    const client = new OAuth2Client(clientId);
    let ticket;
    try {
      ticket = await client.verifyIdToken({ idToken, audience: clientId });
    } catch {
      throw new UnauthorizedException('Token Google không hợp lệ');
    }

    const payload = ticket.getPayload();
    if (!payload?.email) {
      throw new UnauthorizedException('Tài khoản Google không có email');
    }

    const email = payload.email.toLowerCase().trim();
    const sub = payload.sub;
    const fullName = (payload.name && payload.name.trim()) || email.split('@')[0];
    const avatarUrl = payload.picture?.trim() || undefined;

    let user = await this.userRepo.findOne({ where: { googleId: sub } });
    if (!user) {
      user = await this.userRepo.findOne({ where: { email } });
    }

    if (user) {
      if (user.googleId && user.googleId !== sub) {
        throw new ConflictException('Email đã gắn với tài khoản Google khác');
      }
      user.googleId = sub;
      user.fullName = fullName;
      if (avatarUrl) user.avatarUrl = avatarUrl;
    } else {
      user = this.userRepo.create({
        email,
        fullName,
        googleId: sub,
        avatarUrl: avatarUrl ?? null,
      });
    }

    await this.userRepo.save(user);
    await this.usersService.recordSuccessfulLogin(user.id);

    const fresh = await this.userRepo.findOne({ where: { id: user.id } });
    if (!fresh) throw new UnauthorizedException();
    const token = this.jwtService.sign({ sub: fresh.id, email: fresh.email });
    const { password, ...userWithoutPassword } = fresh;
    return { user: userWithoutPassword, token };
  }
}
