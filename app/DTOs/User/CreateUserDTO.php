<?php

declare(strict_types=1);

namespace App\DTOs\User;

use App\Enums\RoleEnum;

final readonly class CreateUserDTO
{
    public function __construct(
        public string $nom,
        public string $prenom,
        public string $email,
        public string $password,
        public RoleEnum $role = RoleEnum::CITIZEN,
    ) {
    }

    public function toArray(): array
    {
        return [
            'nom'      => $this->nom,
            'prenom'   => $this->prenom,
            'email'    => $this->email,
            'password' => $this->password,
        ];
    }
}
