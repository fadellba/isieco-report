<?php

declare(strict_types=1);

namespace App\Repositories\Eloquent;

use App\Models\User;
use App\Repositories\Contracts\UserRepositoryInterface;
use Illuminate\Database\Eloquent\Model;

final class UserRepository extends BaseRepository implements UserRepositoryInterface
{
    public function __construct(
        User $model
    ) {
        parent::__construct($model);
    }


    public function create(array $attributes): User
    {
        /** @var User $user */
        $user = parent::create($attributes);

        return $user;
    }


    public function update(
        Model $model,
        array $attributes
    ): User {
        /** @var User $user */
        $user = parent::update(
            $model,
            $attributes
        );

        return $user;
    }


    public function findByEmail(
        string $email
    ): ?User {
        return $this->model
            ->newQuery()
            ->where('email', $email)
            ->first();
    }


    public function emailExists(
        string $email
    ): bool {
        return $this->model
            ->newQuery()
            ->where('email', $email)
            ->exists();
    }
}
