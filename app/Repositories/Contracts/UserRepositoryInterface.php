<?php

declare(strict_types=1);

namespace App\Repositories\Contracts;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

interface UserRepositoryInterface extends BaseRepositoryInterface
{
    public function create(array $attributes): User;

    public function update(
        Model $model,
        array $attributes
    ): User;

    public function findByEmail(string $email): ?User;

    public function emailExists(string $email): bool;
}
