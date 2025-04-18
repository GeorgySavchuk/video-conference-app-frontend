'use client'
import React from 'react'
import {Controller, useForm, SubmitHandler} from "react-hook-form";
import {CircularProgress} from "@mui/material";
import Link from 'next/link';
import { useUnit } from 'effector-react';
import { $loginError, $loginPending, loginFormSubmitted, resetLoginError } from '@/shared/store/auth';
import styles from './styles.module.css'
import cn from 'classnames'

type LoginFormValues = {
    username: string;
    password: string;
    loginError: string;
}

const SignInForm = () => {
    const {
        handleSubmit,
        formState: { errors },
        control,
    } = useForm<LoginFormValues>({
        defaultValues: {
            username: "",
            password: "",
            loginError: ""
        }
    });

    const [loading, loginError, login] = useUnit([$loginPending, $loginError, loginFormSubmitted])

    const confirmLogin: SubmitHandler<LoginFormValues> = ({username, password}) => {
        resetLoginError()
        console.log( login({
            username,
            password,
        }), '---PENIS');
        login({
            username,
            password,
        })
    }

    return (
        <div className={styles.loginContainer}>
            <form className={styles.loginForm} onSubmit={handleSubmit(confirmLogin)}>
                <h2 className={styles.formTitle}>Авторизация</h2>
                <div className={styles.inputGroup}>
                    <Controller
                        name="username"
                        control={control}
                        render={({ field }) => (
                            <input type="text" autoComplete="off" {...field} className={cn(styles.defaultInput, {
                                [styles.activeInput]: field.value,
                                [styles.errorInput]: errors.username,
                            })}/>
                        )}
                        rules={{
                            required: "Данное поле обязательно",
                            pattern: {
                                value: /^[a-zA-Z0-9_-]+$/,
                                message: "Некорректный логин",
                            },
                            minLength: {
                                value: 3,
                                message: "Логин должен содержать минимум 3 символа",
                            },
                            maxLength: {
                                value: 16,
                                message: "Логин не должен превышать 16 символов",
                            },
                        }}
                    />
                    <label htmlFor="">{errors.username ? errors.username.message : "Логин"}</label>
                </div>
                <div className={styles.inputGroup}>
                    <Controller
                        name="password"
                        control={control}defaultValue=""
                        render={({ field }) => (
                            <input type="password" autoComplete="off" {...field} className={cn(styles.defaultInput, {
                                [styles.activeInput]: field.value,
                                [styles.errorInput]: errors.password,
                            })}/>
                        )}
                        rules={{
                            required: "Данное поле обязательно",
                            minLength: {
                                value: 3,
                                message: "Пароль должен содержать минимум 3 символа",
                            },
                            maxLength: {
                                value: 20,
                                message: "Пароль не должен превышать 20 символов",
                            },
                        }}
                    />
                    <label htmlFor="">{errors.password ? errors.password.message : "Пароль"}</label>
                </div>
                <button className={styles.loginBtn}>{loading ? <CircularProgress size={20} color={"inherit"}/> : "Войти"}</button>
                {
                    loginError.isError &&
                    <div className={styles.loginError}>
                        {loginError.message}
                    </div>
                }
                <span className={styles.accountInfo}>Нет аккаунта? <Link href="/sign-up">Зарегистрироваться</Link></span>
            </form>
        </div>
    );
}

export default SignInForm;